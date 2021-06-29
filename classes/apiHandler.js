const fetch = require('node-fetch');
const helmet = require("helmet");
const bodyParser = require('body-parser');
const joi = require("joi");
joi.objectId = require("joi-objectid")(joi);
let { SignJWT } = require("./jwtService.js");
let { checkToken } = require("./comman.js");
const errorCode = require("../comman/dataCodes");
const { ObjectID } = require('mongodb');

module.exports = {
    BindWithCluster: function (app) {
        app.use(helmet());
        app.use(bodyParser.urlencoded({ extended: true }));
        app.use(bodyParser.json());

        app.get('/', function (req, res) {
            res.send('ok http');
        });

        app.get('/api/users/test', function (req, res) {
            console.log("test api...");
            res.send('ok http');
        });

        app.post('/api/users/signup',async function (req, res) {
            console.log("req data",req.body);
            const schema = joi
                .object({
                    email: joi.string().email().required(),
                    name: joi.string().required(),
                    password: joi.string().required()
                })
                .required()
                .options({ allowUnknown: true, stripUnknown: true })
            
            const { error, value } = schema.validate(req.body);
            
            if (error)
                return res.send({ error: 1, message: errorCode.data.invalid });

            var userDetail = await db.collection('User').find({email: req.body.email}).toArray();
            if (userDetail.length == 0) {
                let userData = {
                    email: req.body.email,
                    name: req.body.name,
                    password: req.body.password,
                    _isOnline: false
                }
                var newUser = await db.collection('User').insertOne(userData);
                return res.send({ error: 0, data: { name: newUser.ops[0].name, email: newUser.ops[0].email, userid: newUser.ops[0]._id.toString() } });
            } else {
                return res.send({ error: 1, message: errorCode.user.userExist });
            }
        });          

        app.post('/api/users/login',async function (req, res) {
            console.log("req daya",req.body);
            const schema = joi
                .object({
                    email: joi.string().email().required(),
                    password: joi.string().required()
                })
                .required()
                .options({ allowUnknown: true, stripUnknown: true })
            
            const { error, value } = schema.validate(req.body);
            
            if (error)
                return res.send({ error: 1, message: errorCode.data.invalid });
            
            var userDetail = await db.collection('User').findOne({email: req.body.email});
            console.log(userDetail)
            if (userDetail) {
                console.log(req.body.password)
                console.log(userDetail.password)
                if(req.body.password == userDetail.password){
                    console.log("wdfdsvd")
                    await db.collection('User').updateOne({email: req.body.email},{$set:{_isOnline: true}},{ upsert: true });
                    let token = await SignJWT({ _id: userDetail._id, email: userDetail.email });

                    if (!token)
                      return res.send({ error: 1, message: errorCode.server.internalError });
          
                    return res.send({ error: 0, data: { token } });
                } else {
                    return res.send({ error: 1, message: errorCode.user.wrongPassword });
                }
            }
        });

        app.post('/api/users/me', checkToken, async function (req, res, next){
            console.log(req.body)
            const schema = joi
                .object({
                    email: joi.string().email().required(),
                })
                .required()
                .options({ allowUnknown: true, stripUnknown: true })

            const { error, value } = schema.validate(req.body);
            
            if (error)
                return res.send({ error: 1, message: errorCode.data.invalid });

            var userDetail = await db.collection('User').findOne({email: req.body.email, _isOnline: true});
            console.log(userDetail)
            if (userDetail) {
                return res.send({ error: 0, data: { userDetail } });
            } else {
                return res.send({ error: 1, message: errorCode.user.userNotExist });
            }
        });

        app.get('/api/random-joke',async function (req, res) {
            console.log("random-joke...");
            const settings = {
                method: 'GET',
                headers: {
                    'Content-Type': "application/json",
                }
            };
            try {
                const fetchResponse = await fetch('https://api.chucknorris.io/jokes/random', settings);
                const resdata = await fetchResponse.json();
                console.log("resdata:",resdata)
                return res.send({ error: 0, data: { resdata } });
            } catch (e) {
                return res.send({ error: 1, message: e });
            }
        });

        app.post('/api/users/logout',async function (req, res) {
            console.log("req daya",req.body);
            const schema = joi
                .object({
                    email: joi.string().email().required()
                })
                .required()
                .options({ allowUnknown: true, stripUnknown: true })
            
            const { error, value } = schema.validate(req.body);
          
            if (error)
                return res.send({ error: 1, message: errorCode.data.invalid });
            
            var userDetail = await db.collection('User').findOne({email: req.body.email});
            if (userDetail) {
                await db.collection('User').updateOne({email: req.body.email},{$set:{_isOnline: false}},{ upsert: true });
                return res.send({ error: 0, data: { } });
            } else {
                return res.send({ error: 1, message: errorCode.user.userNotExist });
            }
        });
    }
}