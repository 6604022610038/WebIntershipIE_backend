/** ฝั่งนักศึกษา (ข้อมูลฝึกงาน, รายงานประจำสัปดาห์, ปฏิทิน, Dashboard) */
module.exports = [
  ['/api/students', require('./routes/studentRoutes')],
  ['/api/internships', require('./routes/internshipRoutes')],
  ['/api/weekly-reports', require('./routes/weeklyReportRoutes')],
  ['/api/activities', require('./routes/activityRoutes')],
  ['/api/dashboard', require('./routes/dashboardRoutes')],
];
