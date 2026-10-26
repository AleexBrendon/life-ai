const express = require("express");

const { dashboard } = require("../controllers/dashboard.controller");

const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", authMiddleware, dashboard);
router.get("/insights", authMiddleware, async (req,res)=>{
 try{const data=await require('../services/dashboardInsights.service').getInsights(req.user.id,{days:req.query.days,startDate:req.query.startDate,endDate:req.query.endDate});res.json({success:true,data})}
 catch(error){res.status(error.status||500).json({success:false,message:error.status?error.message:"Não foi possível carregar os gráficos."})}
});

module.exports = router;
