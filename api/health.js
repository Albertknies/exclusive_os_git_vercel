'use strict';
// First serverless backend endpoint. No customer data, no authentication.
module.exports = function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET') {res.setHeader('Allow','GET');return res.status(405).json({error:'method_not_allowed'});}
  return res.status(200).json({service:'exclusive-os',status:'ok',mode:'demo',backend:'scaffold',database:false,authentication:false});
};
