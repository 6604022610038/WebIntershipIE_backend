*** Settings ***
Documentation     ทดสอบฟีเจอร์ Intelligence ทั้งหมด (Progress, Risk, Twin, Recommendation,
...               Report Intelligence, AI Mentor, What-if, Anomaly Detection)
Resource          ../resources/common.resource
Suite Setup       Prepare Tokens

*** Variables ***
${STUDENT_TOKEN}    ${EMPTY}
${ADVISOR_TOKEN}    ${EMPTY}

*** Keywords ***
Prepare Tokens
    ${s}=    Login And Get Token    ${STUDENT_USER}    ${STUDENT_PASS}
    ${a}=    Login And Get Token    ${ADVISOR_USER}    ${ADVISOR_PASS}
    Set Suite Variable    ${STUDENT_TOKEN}    ${s}
    Set Suite Variable    ${ADVISOR_TOKEN}    ${a}

*** Test Cases ***
Digital Twin Contains Progress And Risk
    [Tags]    twin    progress    risk
    ${resp}=    Authorized GET    /intelligence/student/${STUDENT_USER}    ${STUDENT_TOKEN}
    Status Should Be    ${resp}    200
    ${data}=    Set Variable    ${resp.json()}
    Dictionary Should Contain Key    ${data}    progress
    Dictionary Should Contain Key    ${data}    risk
    Dictionary Should Contain Key    ${data}    journey
    Should Be True    0 <= ${data}[progress][percent] <= 100
    Should Be True    $data['risk']['level'] in ['low', 'medium', 'high']

Digital Twin Contains Recommendations And Report Intelligence
    [Tags]    twin    recommendation    report-intelligence
    ${resp}=    Authorized GET    /intelligence/student/${STUDENT_USER}    ${STUDENT_TOKEN}
    Status Should Be    ${resp}    200
    Dictionary Should Contain Key    ${resp.json()}    recommendations
    Dictionary Should Contain Key    ${resp.json()}    reportIntelligence
    ${count}=    Get Length    ${resp.json()}[recommendations]
    Should Be True    ${count} >= 1

Recommendations Endpoint Returns Prioritized Items
    [Tags]    recommendation
    ${resp}=    Authorized GET    /intelligence/recommendations/${STUDENT_USER}    ${STUDENT_TOKEN}
    Status Should Be    ${resp}    200
    ${first}=    Get From List    ${resp.json()}[recommendations]    0
    Should Be True    $first['priority'] in ['high', 'medium', 'low']

Report Quality Endpoint Returns Score
    [Tags]    report-intelligence
    ${resp}=    Authorized GET    /intelligence/report-quality/${STUDENT_USER}    ${STUDENT_TOKEN}
    Status Should Be    ${resp}    200
    Should Be True    0 <= ${resp.json()}[avgQuality] <= 100

AI Mentor Answers Progress Question
    [Tags]    mentor
    ${body}=    Create Dictionary    question=ความคืบหน้าตอนนี้เป็นยังไง
    ${resp}=    Authorized POST    /intelligence/mentor/${STUDENT_USER}    ${STUDENT_TOKEN}    ${body}
    Status Should Be    ${resp}    200
    Should Not Be Empty    ${resp.json()}[reply]

AI Mentor Handles Empty Question
    [Tags]    mentor
    ${body}=    Create Dictionary    question=${EMPTY}
    ${resp}=    Authorized POST    /intelligence/mentor/${STUDENT_USER}    ${STUDENT_TOKEN}    ${body}
    Status Should Be    ${resp}    200
    Should Not Be Empty    ${resp.json()}[reply]

What-if Extra Reports Do Not Lower Progress
    [Tags]    whatif
    ${body}=    Create Dictionary    extraReports=3    daysAhead=0    fixPending=${True}
    ${resp}=    Authorized POST    /intelligence/whatif/${STUDENT_USER}    ${STUDENT_TOKEN}    ${body}
    Status Should Be    ${resp}    200
    Dictionary Should Contain Key    ${resp.json()}    baseline
    Dictionary Should Contain Key    ${resp.json()}    simulated
    Should Be True    ${resp.json()}[delta][percent] >= 0

What-if Doing Nothing For Weeks Does Not Reduce Risk
    [Tags]    whatif
    ${body}=    Create Dictionary    extraReports=0    daysAhead=28
    ${resp}=    Authorized POST    /intelligence/whatif/${STUDENT_USER}    ${STUDENT_TOKEN}    ${body}
    Status Should Be    ${resp}    200
    Should Be True    ${resp.json()}[delta][riskScore] >= 0

Advisor Overview Lists Students
    [Tags]    advisor    command-center
    ${resp}=    Authorized GET    /intelligence/advisor-overview    ${ADVISOR_TOKEN}
    Status Should Be    ${resp}    200

Anomaly Overview Returns Summary For Advisor
    [Tags]    anomaly    advisor
    ${resp}=    Authorized GET    /intelligence/anomalies    ${ADVISOR_TOKEN}
    Status Should Be    ${resp}    200
    Dictionary Should Contain Key    ${resp.json()}    bySeverity
    Should Be True    ${resp.json()}[total] >= 0

Student Anomalies Endpoint Returns List
    [Tags]    anomaly
    ${resp}=    Authorized GET    /intelligence/anomalies/${STUDENT_USER}    ${STUDENT_TOKEN}
    Status Should Be    ${resp}    200
    Dictionary Should Contain Key    ${resp.json()}    anomalies
