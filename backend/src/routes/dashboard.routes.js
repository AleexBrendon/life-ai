const express = require("express");

const { dashboard } = require("../controllers/dashboard.controller");

const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", authMiddleware, dashboard);
router.get("/insights", authMiddleware, async (req,res)=>{
 const days=Number(req.query.days||14);
 if(![7,14,42].includes(days))return res.status(400).json({success:false,message:"Selecione 7, 14 ou 42 dias."});
 try{const data=await require('../services/dashboardInsights.service').getInsights(req.user.id,days);res.json({success:true,data})}
 catch{res.status(500).json({success:false,message:"Não foi possível carregar os gráficos."})}
});

module.exports = router;
