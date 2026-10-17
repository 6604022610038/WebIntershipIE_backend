
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

/**
 * Robot Framework QA Center
 * รองรับ Backend ที่ Deploy บน Render
 * อ่านผลการทดสอบจาก qa/results/output.xml
 * จำกัดการสั่งรันตาม ENABLE_QA_RUN และสิทธิ์ที่กำหนดใน Route
 */

// รองรับทั้งกรณี qa อยู่ใน Repository root
// และกรณี backend กับ qa อยู่ระดับเดียวกัน
const qaCandidates = [
  path.resolve(__dirname, "..", "..", "..", "qa"),
  path.resolve(__dirname, "..", "..", "..", "..", "qa"),
];

const QA_DIR =
  qaCandidates.find((dir) =>
    fs.existsSync(path.join(dir, "tests"))
  ) || qaCandidates[0];

const RESULTS_DIR = path.join(QA_DIR, "results");
const OUTPUT_XML = path.join(RESULTS_DIR, "output.xml");

const runState = {
  running: false,
  startedAt: null,
  finishedAt: null,
  exitCode: null,
  error: null,
};

function decodeEntities(str = "") {
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function parseAttrs(raw = "") {
  const attrs = {};

  raw.replace(/([\w:-]+)="([^"]*)"/g, (_, key, value) => {
    attrs[key] = decodeEntities(value);
    return "";
  });

  return attrs;
}

/**
 * อ่านผล XML ของ Robot Framework
 * รองรับ Robot Framework 6 และ 7
 */
function parseRobotOutput(xml) {
  const root = { generated: null };
  const suites = [];
  const stack = [];

  let currentSuite = null;
  let currentTest = null;
  let pendingStatus = null;

  const rootMatch = /<robot\b([^>]*)>/.exec(xml);

  if (rootMatch) {
    root.generated = parseAttrs(rootMatch[1]).generated || null;
  }

  const tokenRe =
    /<(\/?)([A-Za-z][\w-]*)([^>]*?)(\/?)>|([^<]+)/g;

  let match;

  while ((match = tokenRe.exec(xml))) {
    const [, closing, tag, rawAttrs, selfClose, text] = match;

    if (text !== undefined) {
      if (pendingStatus) {
        pendingStatus.message += text;
      }
      continue;
    }

    if (closing) {
      if (tag === "status" && pendingStatus) {
        pendingStatus.apply();
        pendingStatus = null;
      }

      const popped = stack.pop();

      if (popped === "test") {
        currentTest = null;
      }

      if (popped === "suite") {
        currentSuite = null;
      }

      continue;
    }

    const attrs = parseAttrs(rawAttrs);

    if (tag === "suite") {
      currentSuite = {
        name: attrs.name || "Suite",
        tests: [],
      };

      suites.push(currentSuite);
    } else if (tag === "test") {
      currentTest = {
        name: attrs.name || "Test",
        status: "UNKNOWN",
        message: "",
        elapsed: null,
        suite: currentSuite ? currentSuite.name : "",
      };

      if (currentSuite) {
        currentSuite.tests.push(currentTest);
      }
    } else if (
      tag === "status" &&
      currentTest &&
      stack[stack.length - 1] === "test"
    ) {
      const test = currentTest;

      const apply = () => {
        test.status = attrs.status || "UNKNOWN";

        const elapsed = parseFloat(attrs.elapsed);

        test.elapsed = Number.isFinite(elapsed)
          ? Math.round(elapsed * 1000) / 1000
          : null;

        test.message = decodeEntities(
          pendingStatus ? pendingStatus.message.trim() : ""
        );
      };

      if (selfClose) {
        apply();
      } else {
        pendingStatus = {
          message: "",
          apply,
        };
      }

      continue;
    }

    if (!selfClose) {
      stack.push(tag);
    }
  }

  const filteredSuites = suites.filter(
    (suite) => suite.tests.length > 0
  );

  const allTests = filteredSuites.flatMap(
    (suite) => suite.tests
  );

  const totals = {
    total: allTests.length,
    pass: allTests.filter((test) => test.status === "PASS").length,
    fail: allTests.filter((test) => test.status === "FAIL").length,
    skip: allTests.filter((test) => test.status === "SKIP").length,
  };

  return {
    generated: root.generated,
    totals,
    suites: filteredSuites,
  };
}

/**
 * GET ผลการทดสอบล่าสุด
 */
exports.getResults = (req, res) => {
  try {
    if (!fs.existsSync(OUTPUT_XML)) {
      return res.json({
        available: false,
        run: runState,
      });
    }

    const xml = fs.readFileSync(OUTPUT_XML, "utf8");
    const parsed = parseRobotOutput(xml);
    const stat = fs.statSync(OUTPUT_XML);

    return res.json({
      available: true,
      generatedAt:
        parsed.generated || stat.mtime.toISOString(),
      totals: parsed.totals,
      passRate: parsed.totals.total
        ? Math.round(
            (parsed.totals.pass / parsed.totals.total) * 100
          )
        : 0,
      suites: parsed.suites,
      hasReport: fs.existsSync(
        path.join(RESULTS_DIR, "report.html")
      ),
      run: runState,
    });
  } catch (error) {
    return res.status(500).json({
      message: "ไม่สามารถอ่านผลการทดสอบได้",
      error: error.message,
    });
  }
};

/**
 * เปิด/ปิดการรันทดสอบตาม Environment Variable
 */
function qaRunEnabled() {
  const flag = (
    process.env.ENABLE_QA_RUN || ""
  ).toLowerCase();

  if (flag === "true") return true;
  if (flag === "false") return false;

  return process.env.NODE_ENV !== "production";
}

/**
 * POST สั่งรัน Robot Framework
 */
exports.runTests = (req, res) => {
  if (!qaRunEnabled()) {
    return res.status(403).json({
      message:
        "การสั่งรันชุดทดสอบถูกปิดใน environment นี้",
    });
  }

  if (runState.running) {
    return res.status(409).json({
      message:
        "กำลังรันการทดสอบอยู่ กรุณารอสักครู่",
      run: runState,
    });
  }

  // ตรวจสอบตำแหน่งไฟล์ก่อนเริ่มรัน
  const testsDir = path.join(QA_DIR, "tests");
  const requirementsFile = path.join(
    QA_DIR,
    "requirements.txt"
  );

  if (!fs.existsSync(testsDir)) {
    return res.status(500).json({
      message: "ไม่พบโฟลเดอร์ qa/tests",
      error: `QA_DIR=${QA_DIR}`,
    });
  }

  if (!fs.existsSync(requirementsFile)) {
    return res.status(500).json({
      message: "ไม่พบไฟล์ qa/requirements.txt",
      error: `QA_DIR=${QA_DIR}`,
    });
  }

  const baseUrl =
    process.env.QA_BASE_URL ||
    `http://localhost:${process.env.PORT || 5000}/api`;

  const robotPython =
    process.env.ROBOT_PYTHON || "python3";

  try {
    fs.mkdirSync(RESULTS_DIR, {
      recursive: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "ไม่สามารถสร้างโฟลเดอร์ผลการทดสอบได้",
      error: error.message,
    });
  }

  // เริ่มสถานะการทดสอบ
  Object.assign(runState, {
    running: true,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    exitCode: null,
    error: null,
  });

  let child;
  let stderr = "";
  let spawnFailed = false;

  try {
    console.log("[QA] QA_DIR:", QA_DIR);
    console.log("[QA] Python:", robotPython);
    console.log("[QA] BASE_URL:", baseUrl);

    child = spawn(
      robotPython,
      [
        "-m",
        "robot",
        "--outputdir",
        RESULTS_DIR,
        "--variable",
        `BASE_URL:${baseUrl}`,
        "tests",
      ],
      {
        cwd: QA_DIR,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    child.stdout.on("data", (data) => {
      console.log("[Robot]", data.toString().trim());
    });

    child.stderr.on("data", (data) => {
      const message = data.toString();

      console.error("[Robot Error]", message);

      // จำกัดขนาดข้อความ Error ที่เก็บในหน่วยความจำ
      stderr = (stderr + message).slice(-8000);
    });

    child.on("error", (error) => {
      spawnFailed = true;

      const message =
        error.code === "ENOENT"
          ? `ไม่พบคำสั่ง ${robotPython} หรือ Python ไม่พร้อมใช้งาน`
          : error.message;

      Object.assign(runState, {
        running: false,
        finishedAt: new Date().toISOString(),
        error: message,
      });

      console.error("[QA] Spawn failed:", message);
    });

    child.on("close", (code) => {
      if (spawnFailed) return;

      const outputExists = fs.existsSync(OUTPUT_XML);

      Object.assign(runState, {
        running: false,
        finishedAt: new Date().toISOString(),
        exitCode: code,
        error:
          !outputExists
            ? stderr.trim() ||
              `Robot Framework จบการทำงานด้วยรหัส ${code} แต่ไม่พบ output.xml`
            : null,
      });

      console.log(
        "[QA] Finished. Exit code:",
        code,
        "Output exists:",
        outputExists
      );
    });
  } catch (error) {
    Object.assign(runState, {
      running: false,
      finishedAt: new Date().toISOString(),
      error: error.message,
    });

    return res.status(500).json({
      message: "ไม่สามารถเริ่มรันการทดสอบได้",
      run: runState,
    });
  }

  return res.status(202).json({
    message: "เริ่มรันการทดสอบแล้ว",
    run: runState,
  });
};

exports.parseRobotOutput = parseRobotOutput;
