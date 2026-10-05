const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

/**
 * 🤖 Robot Framework QA Center
 * อ่านผลจาก qa/results/output.xml แล้วสรุปเป็น PASS/FAIL ให้หน้า QA Center
 * และสั่งรัน `robot` ได้ (เฉพาะผู้ดูแลระบบ) โดยใช้คำสั่งที่กำหนดตายตัว ไม่รับ input จากผู้ใช้
 */
const QA_DIR = path.join(__dirname, "..", "..", "..", "..", "qa");
const OUTPUT_XML = path.join(QA_DIR, "results", "output.xml");

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
  raw.replace(/([\w:-]+)="([^"]*)"/g, (_, k, v) => {
    attrs[k] = decodeEntities(v);
    return "";
  });
  return attrs;
}

/**
 * Parser เล็ก ๆ สำหรับ output.xml ของ Robot Framework (รองรับ RF 6/7)
 * เก็บเฉพาะ suite → test และสถานะ <status> ที่เป็นลูกตรงของ <test>
 */
function parseRobotOutput(xml) {
  const root = { generated: null };
  const suites = [];
  const stack = [];
  let currentSuite = null;
  let currentTest = null;
  let pendingStatus = null;

  const rootMatch = /<robot\b([^>]*)>/.exec(xml);
  if (rootMatch) root.generated = parseAttrs(rootMatch[1]).generated || null;

  const tokenRe = /<(\/?)([A-Za-z][\w-]*)([^>]*?)(\/?)>|([^<]+)/g;
  let m;
  while ((m = tokenRe.exec(xml))) {
    const [, closing, tag, rawAttrs, selfClose, text] = m;

    if (text !== undefined) {
      if (pendingStatus) pendingStatus.message += text;
      continue;
    }

    if (closing) {
      if (tag === "status" && pendingStatus) {
        pendingStatus.apply();
        pendingStatus = null;
      }
      const popped = stack.pop();
      if (popped === "test") currentTest = null;
      continue;
    }

    const attrs = parseAttrs(rawAttrs);

    if (tag === "suite") {
      currentSuite = { name: attrs.name || "Suite", tests: [] };
      suites.push(currentSuite);
    } else if (tag === "test") {
      currentTest = {
        name: attrs.name || "Test",
        status: "UNKNOWN",
        message: "",
        elapsed: null,
        suite: currentSuite ? currentSuite.name : "",
      };
      if (currentSuite) currentSuite.tests.push(currentTest);
    } else if (tag === "status" && currentTest && stack[stack.length - 1] === "test") {
      const test = currentTest;
      const apply = () => {
        test.status = attrs.status || "UNKNOWN";
        const el = parseFloat(attrs.elapsed);
        test.elapsed = Number.isFinite(el) ? Math.round(el * 1000) / 1000 : null;
        test.message = decodeEntities(pendingStatus ? pendingStatus.message.trim() : "");
      };
      if (selfClose) {
        apply();
      } else {
        pendingStatus = { message: "", apply };
      }
      continue;
    }

    if (!selfClose) stack.push(tag);
  }

  const filtered = suites.filter((s) => s.tests.length > 0);
  const all = filtered.flatMap((s) => s.tests);
  const totals = {
    total: all.length,
    pass: all.filter((t) => t.status === "PASS").length,
    fail: all.filter((t) => t.status === "FAIL").length,
    skip: all.filter((t) => t.status === "SKIP").length,
  };

  return { generated: root.generated, totals, suites: filtered };
}

exports.getResults = (req, res) => {
  try {
    if (!fs.existsSync(OUTPUT_XML)) {
      return res.json({ available: false, run: runState });
    }
    const xml = fs.readFileSync(OUTPUT_XML, "utf8");
    const parsed = parseRobotOutput(xml);
    const stat = fs.statSync(OUTPUT_XML);
    res.json({
      available: true,
      generatedAt: parsed.generated || stat.mtime.toISOString(),
      totals: parsed.totals,
      passRate: parsed.totals.total ? Math.round((parsed.totals.pass / parsed.totals.total) * 100) : 0,
      suites: parsed.suites,
      hasReport: fs.existsSync(path.join(QA_DIR, "results", "report.html")),
      run: runState,
    });
  } catch (error) {
    res.status(500).json({ message: "ไม่สามารถอ่านผลการทดสอบได้", error: error.message });
  }
};

/**
 * การสั่งรัน robot บนเซิร์ฟเวอร์ ปิดไว้เมื่อ NODE_ENV=production
 * เว้นแต่จะตั้ง ENABLE_QA_RUN=true เองอย่างชัดเจน (และตั้ง ENABLE_QA_RUN=false เพื่อปิดในทุก environment ได้)
 */
function qaRunEnabled() {
  const flag = (process.env.ENABLE_QA_RUN || "").toLowerCase();
  if (flag === "true") return true;
  if (flag === "false") return false;
  return process.env.NODE_ENV !== "production";
}

exports.runTests = (req, res) => {
  if (!qaRunEnabled()) {
    return res.status(403).json({ message: "การสั่งรันชุดทดสอบถูกปิดใน environment นี้" });
  }
  if (runState.running) {
    return res.status(409).json({ message: "กำลังรันการทดสอบอยู่ กรุณารอสักครู่", run: runState });
  }

  const port = process.env.PORT || 5000;
  const baseUrl = process.env.QA_BASE_URL || `http://localhost:${port}/api`;
  const robotCmd = process.env.ROBOT_CMD || "robot";

  Object.assign(runState, {
    running: true,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    exitCode: null,
    error: null,
  });

  let child;
  try {
    child = spawn(robotCmd, ["--outputdir", "results", "--variable", `BASE_URL:${baseUrl}`, "tests"], {
      cwd: QA_DIR,
      stdio: "ignore",
    });
  } catch (err) {
    Object.assign(runState, { running: false, finishedAt: new Date().toISOString(), error: err.message });
    return res.status(500).json({ message: "ไม่สามารถเริ่มรันการทดสอบได้", run: runState });
  }

  child.on("error", (err) => {
    Object.assign(runState, {
      running: false,
      finishedAt: new Date().toISOString(),
      error:
        err.code === "ENOENT"
          ? "ไม่พบ Robot Framework ในเครื่อง — ติดตั้งด้วย: pip install -r qa/requirements.txt"
          : err.message,
    });
  });

  child.on("close", (code) => {
    // robot คืนค่า exit code = จำนวน test ที่ fail (ไม่ใช่ error ของระบบ)
    if (runState.error) return;
    Object.assign(runState, { running: false, finishedAt: new Date().toISOString(), exitCode: code });
  });

  res.status(202).json({ message: "เริ่มรันการทดสอบแล้ว", run: runState });
};

exports.parseRobotOutput = parseRobotOutput;
