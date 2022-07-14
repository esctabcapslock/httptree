//@ts-check
const httptree = require('../lib')
const http = require('http')

// creage httptree module
const hp = new httptree.Server() 
const port = 3000

// add get methon in '/' path
hp.get((req,res,data,obj)=>{ 
    console.log('res / ans',res.statusCode)
    res.send('<a href="#">hello httptree!!</a>')
})
hp.path('index.html').get((req,res,data,obj)=>{

    // Existing functions inside  http module can be used.
    res.setHeader('Access-Control-Allow-Origin','*')
    console.log('res index.html',res.statusCode, data)
    res.sendFile(__dirname+'\\index.html')
})

console.log('this structure:',hp.printStructure())
http.createServer((req,res)=>{ 
    console.log('req:',req.url)

    // hp.parse return boolean that Whether it sent a reply to the client
    return hp.parse(req,res,{}) ||

    // httptree.httpError is simple http error handler
    httptree.httpError(404,res,'not file')

}).listen(port,()=>console.log('server port:',port))