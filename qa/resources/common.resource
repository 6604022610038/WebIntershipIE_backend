*** Settings ***
Documentation     Keywords และตัวแปรกลางที่ใช้ร่วมกันในทุก test suite
Library           RequestsLibrary
Library           Collections

*** Variables ***
${BASE_URL}           http://localhost:5000/api
${STUDENT_USER}       640123456
${STUDENT_PASS}       123456
${STUDENT_OTHER}      640123457
${ADVISOR_USER}       teacher001
${ADVISOR_PASS}       123456
${ADMIN_USER}         admin001
${ADMIN_PASS}         123456

*** Keywords ***
Login And Get Token
    [Arguments]    ${username}    ${password}
    ${body}=    Create Dictionary    username=${username}    password=${password}
    ${resp}=    POST    ${BASE_URL}/auth/login    json=${body}    expected_status=200
    ${data}=    Set Variable    ${resp.json()}
    RETURN    ${data}[token]

Auth Headers
    [Arguments]    ${token}
    ${headers}=    Create Dictionary    Authorization=Bearer ${token}
    RETURN    ${headers}

Authorized GET
    [Arguments]    ${path}    ${token}
    ${headers}=    Auth Headers    ${token}
    ${resp}=    GET    ${BASE_URL}${path}    headers=${headers}    expected_status=any
    RETURN    ${resp}

Authorized POST
    [Arguments]    ${path}    ${token}    ${body}
    ${headers}=    Auth Headers    ${token}
    ${resp}=    POST    ${BASE_URL}${path}    json=${body}    headers=${headers}    expected_status=any
    RETURN    ${resp}

Status Should Be
    [Arguments]    ${resp}    ${expected}
    Should Be Equal As Integers    ${resp.status_code}    ${expected}
