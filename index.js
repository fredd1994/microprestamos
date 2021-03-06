  var express = require("express"),
    app = express(),
    bodyParser  = require("body-parser"),
    methodOverride = require("method-override"),
    Validator = require('validatorjs'),
    nodemailer = require('nodemailer'),
    swaggerJsDoc = require("swagger-jsdoc");
    swaggerUi = require("swagger-ui-express");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride());

const router = express.Router();
const jsonParser = bodyParser.json();
const port = process.env.PORT || 8080;

const swaggerOptions = {
  swaggerDefinition: {
    info: {
      version: "1.0.0",
      title: "Microprestamos api",
      description: "API para calcular la cuota de un microprestamo que un cliente quiere solicitar y debe pagar mensualmente/quincenalmente.",
      contact: {
        name: "Fredd Alvarez Acuña"
      },
      servers: [
        "http://localhost:8080", 
        "https://microprestamos.herokuapp.com/"
      ]
      
    }
  },
  // ['.routes/*.js']
  apis: ["index.js"]
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

Validator.useLang('es');

// Routes
/**
 * @swagger
 * /:
 *  get:
 *    description: Use to home page
 *    responses:
 *      '200':
 *        description: A successful response
 */
app.get("/", (req, res) => {
  res.status(200).send("Microprestamos");
});

/**
* @swagger
*  /loan_cuota:
*    post:
*      description: Calcula la cuota de un prestamo
*      parameters:
*      - in: body
*        name: body
*        description: Campo donde ira el json con los datos
*        required: true
*        schema:
*          type: string
*          format: string
*          example: 
*                {
*                  "name":"Fredd",
*                  "email":"fredd.a14@hotmail.com",
*                  "totalIngress": 100000,
*                  "sector":"publico",
*                  "workYears":5,
*                  "amount":2000,
*                  "frecuency":"quincenal",
*                  "payTime":24
*                 }
*      responses:
*        200:
*          description: Calculo realizado
*          content:
*            application/json:
*               schema:
*                 type: array
*                 items: 
*                   properties:
*                     amount: 
*                       type: number
*                       example: 2000
*                     frecuncy:
*                       type: string
*                       example: mensual
*                     paytime:
*                       type: integer
*                       example: 24
*/
router.post('/loan_cuota',jsonParser, function(req, res) {
  const validationRules = {
    "name":"required|string", 
    "email": "required|email",
    "totalIngress":"required|numeric",
    "sector": "required|string|in:publico,privado",
    "workYears": "required|integer",
    "amount": "required|integer|min:100|max:2000",
    "frecuency": "string|in:mensual,quincenal",
    "payTime": "integer"
  }

  var name = req.body.name;
  var email= req.body.email;
  var totalIngress= req.body.totalIngress;
  var sector= req.body.sector;
  var workYears= req.body.workYears;
  var amount= req.body.amount;
  var frecuency=req.body.frecuency || "mensual";
  var payTime= req.body.payTime || 3;

  let validation = new Validator(req.body, validationRules);
 
  if (validation.passes()) {
    
    var loan_quota = calculate_loan_quota(amount,18,payTime,frecuency).toFixed(2);

    var output = {
      "amount"    :`$${amount}.`,
      "text"      : `La cuota sería $${loan_quota} ${frecuency} durante ${payTime} meses.`,
      "frecuency" : frecuency,
      "paytime"   : `${payTime} meses.`
   } 

   contentHTML = `
   <h1>User Information</h1>
   <ul>
       <li>Name: ${name}</li>
       <li>Email: ${email}</li>
       <li>Total Ingress: ${totalIngress}</li>
       <li>Sector: ${sector}</li>
       <li>Work Years: ${workYears}</li>
       <li>Amount: ${amount}</li>
       <li>Frecuency: ${frecuency}</li>
       <li>Pay Time: ${payTime}</li>
       <li>Loan Cuota: ${loan_quota}</li>
   </ul>  
  `;
 
   let transporter = nodemailer.createTransport({
     service: 'Gmail', // no need to set host or port etc.
     auth: {
       user: 'micropagos2020@gmail.com',
       pass: 'Micropagoscr'
     }
   });
   
   var mailOptions = {
     from: 'micropagos2020@gmail.com',
     to: 'sergio@mawi.io',
     subject: 'Solicutud de nuevo crédito',
     html : contentHTML
   };
   
   transporter.sendMail(mailOptions, function(error, info){
     if (error) {
       console.log(error);
     } else {
       console.log(`Email sent:${info.response}` );
     }
   });
  } else {

    var output = validation.errors;
  }
  res.send(output);
});

app.use(router);

app.listen(port, function() {
  console.log("Node server running on http://localhost:3000");
});

function calculate_loan_quota(amount, rate, totalTerm, frecuency) {
  var interest = parseFloat(rate) / 100 / 12;
  var period_int = Math.pow(1 + interest, totalTerm);
  var monthly_payment = (amount * period_int * interest) / (period_int - 1);
  return frecuency == 'mensual' ? monthly_payment : monthly_payment / 2;
}