'use strict';
module.exports=function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'method_not_allowed'});}
  const configured=Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY&&process.env.SESSION_SECRET?.length>=32);
  return res.status(200).json({service:'exclusive-os',status:'ok',mode:configured?'backend-configured':'demo',backend:'operations-v2',database:configured?'configured-not-verified':false,authentication:configured?'configured-not-verified':false,legacy_ui:'demo',operational_ui:'/operacional.html'});
};
