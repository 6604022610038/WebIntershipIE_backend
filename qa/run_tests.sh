#!/usr/bin/env bash
# รัน Robot Framework test suite ทั้งหมด (ต้องเปิด backend ไว้ก่อน)
# ใช้: ./run_tests.sh [BASE_URL]
cd "$(dirname "$0")"
BASE_URL="${1:-http://localhost:5000/api}"
robot --outputdir results --variable "BASE_URL:${BASE_URL}" tests
