*** Settings ***
Documentation     ทดสอบความปลอดภัยและการควบคุมสิทธิ์ (Authorization)
Resource          ../resources/common.resource
Suite Setup       Prepare Tokens

*** Variables ***
${STUDENT_TOKEN}    ${EMPTY}
${ADVISOR_TOKEN}    ${EMPTY}
${ADMIN_TOKEN}      ${EMPTY}

*** Keywords ***
Prepare Tokens
    ${s}=    Login And Get Token    ${STUDENT_USER}    ${STUDENT_PASS}
    Set Suite Variable    ${STUDENT_TOKEN}    ${s}
    ${a}=    Login And Get Token    ${ADVISOR_USER}    ${ADVISOR_PASS}
    Set Suite Variable    ${ADVISOR_TOKEN}    ${a}
    ${m}=    Login And Get Token    ${ADMIN_USER}    ${ADMIN_PASS}
    Set Suite Variable    ${ADMIN_TOKEN}    ${m}

*** Test Cases ***
Twin Endpoint Requires Login
    [Tags]    security
    ${resp}=    GET    ${BASE_URL}/intelligence/student/${STUDENT_USER}    expected_status=any
    Status Should Be    ${resp}    401

Invalid Token Is Rejected
    [Tags]    security
    ${resp}=    Authorized GET    /intelligence/student/${STUDENT_USER}    not-a-real-token
    Status Should Be    ${resp}    401

Student Cannot View Another Students Twin
    [Tags]    security
    ${resp}=    Authorized GET    /intelligence/student/${STUDENT_OTHER}    ${STUDENT_TOKEN}
    Status Should Be    ${resp}    403

Student Cannot Use Mentor For Another Student
    [Tags]    security    mentor
    ${body}=    Create Dictionary    question=ความคืบหน้า
    ${resp}=    Authorized POST    /intelligence/mentor/${STUDENT_OTHER}    ${STUDENT_TOKEN}    ${body}
    Status Should Be    ${resp}    403

Student Cannot Access Advisor Overview
    [Tags]    security    advisor
    ${resp}=    Authorized GET    /intelligence/advisor-overview    ${STUDENT_TOKEN}
    Status Should Be    ${resp}    403

Student Cannot Access Anomaly Overview
    [Tags]    security    anomaly
    ${resp}=    Authorized GET    /intelligence/anomalies    ${STUDENT_TOKEN}
    Status Should Be    ${resp}    403

Student Cannot Access QA Center
    [Tags]    security    qa
    ${resp}=    Authorized GET    /qa/results    ${STUDENT_TOKEN}
    Status Should Be    ${resp}    403

Advisor Cannot Access QA Center
    [Tags]    security    qa
    ${resp}=    Authorized GET    /qa/results    ${ADVISOR_TOKEN}
    Status Should Be    ${resp}    403

Admin Can Access QA Center
    [Tags]    security    qa
    ${resp}=    Authorized GET    /qa/results    ${ADMIN_TOKEN}
    Status Should Be    ${resp}    200

Admin Cannot Access Advisor Dashboard
    [Tags]    security    advisor
    ${resp}=    Authorized GET    /dashboard/advisor    ${ADMIN_TOKEN}
    Status Should Be    ${resp}    403
