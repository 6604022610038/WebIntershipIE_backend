*** Settings ***
Documentation     ทดสอบระบบเข้าสู่ระบบ (Authentication)
Resource          ../resources/common.resource

*** Test Cases ***
Student Can Login With Valid Credentials
    [Tags]    auth    smoke
    ${body}=    Create Dictionary    username=${STUDENT_USER}    password=${STUDENT_PASS}
    ${resp}=    POST    ${BASE_URL}/auth/login    json=${body}    expected_status=any
    Status Should Be    ${resp}    200
    Dictionary Should Contain Key    ${resp.json()}    token
    Should Be Equal    ${resp.json()}[user][role]    student

Advisor Can Login With Valid Credentials
    [Tags]    auth    smoke
    ${body}=    Create Dictionary    username=${ADVISOR_USER}    password=${ADVISOR_PASS}
    ${resp}=    POST    ${BASE_URL}/auth/login    json=${body}    expected_status=any
    Status Should Be    ${resp}    200
    Should Be Equal    ${resp.json()}[user][role]    advisor

Login Fails With Wrong Password
    [Tags]    auth
    ${body}=    Create Dictionary    username=${STUDENT_USER}    password=wrong-password
    ${resp}=    POST    ${BASE_URL}/auth/login    json=${body}    expected_status=any
    Status Should Be    ${resp}    401

Login Fails When Fields Are Missing
    [Tags]    auth
    ${body}=    Create Dictionary    username=${STUDENT_USER}
    ${resp}=    POST    ${BASE_URL}/auth/login    json=${body}    expected_status=any
    Status Should Be    ${resp}    400

Get Me Returns Current User
    [Tags]    auth
    ${token}=    Login And Get Token    ${STUDENT_USER}    ${STUDENT_PASS}
    ${resp}=    Authorized GET    /auth/me    ${token}
    Status Should Be    ${resp}    200
    Should Be Equal    ${resp.json()}[user][username]    ${STUDENT_USER}
