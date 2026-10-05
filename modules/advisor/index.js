/** ฝั่งอาจารย์ที่ปรึกษา (ประเมินผล, Dashboard) */
module.exports = [
  ['/api/evaluations', require('./routes/evaluationRoutes')],
  ['/api/dashboard', require('./routes/dashboardRoutes')],
];
