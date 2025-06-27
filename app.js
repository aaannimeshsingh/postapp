const express=require("express");
const app=express();
const userModel=require("./models/user");
const postModel=require("./models/post");
const coookieParser=require("cookie-parser");
const bcrypt=require('bcrypt');
const jwt=require('jsonwebtoken');
const crypto=require('crypto');
const path=require('path');
const multer=require('multer');
const upload=require("./config/multerconfig");
require('dotenv').config();


app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.set("view engine","ejs");
app.use(coookieParser());
app.use(express.static(path.join(__dirname,"public")));

/*const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images/uploads')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    crypto.randomBytes(12,function(err,bytes){
        const fn=bytes.toString('hex')+path.extname(file.originalname);
        cb(null, fn);
    })
  }
})

const upload = multer({ storage: storage })*/

app.get("/",function(req,res){
    res.render("index");
});

/*app.get("/test",function(req,res){
    res.render("test");
});*/

app.get("/login",function(req,res){
    res.render("login");
});

app.post("/register",async function(req,res){
    let {name,username,password,email,age}=req.body;
    let user= await userModel.findOne({email});
    if(user){
        return res.status(500).send("user already exists");
    }
    bcrypt.genSalt(10, function (err, salt) {
    bcrypt.hash(password, salt, async function (err, hash) {
        let newUser = await userModel.create({
            username,
            email,
            password: hash,
            age,
            name
        });
        let token = jwt.sign({ email: email, userid: newUser._id }, "anime");
        res.cookie("token", token);
        res.status(200).redirect("/profile");
    });
});
});

app.post("/login",async function(req,res){
    let {password,email}=req.body;
    let user= await userModel.findOne({email});
    if(!user){
        return res.status(500).send("something went wrong");
    }
    bcrypt.compare(password,user.password,function(err,result){
        if(result){
            let token = jwt.sign({ email: email, userid: user._id }, "anime");
            res.cookie("token", token);
            res.status(200).redirect("/profile");
        }
        else{
            res.send("something went wrong");
        }
    })
});

app.get("/profile/upload",function(req,res){
    res.render("uploadfile");
});

app.get("/profile", isLoggedIn, async function(req, res) {
    let user = await userModel.findOne({ email: req.user.email }).populate("posts");
    res.render("profile",{user});
});

app.post("upload",upload.single("image"),async function(req,res){
    let user=await userModel.findOne({email:req.user.email});
    user.profilepic=req.file.filename;
    await user.save();
    res.redirect("/profile");
})

app.get("/like/:id", isLoggedIn, async function (req, res) {
    try {
        let post = await postModel.findById(req.params.id);
        if (!post) {
            return res.status(404).send("Post not found");
        }

        const userId = req.user.userid;
        const index = post.likes.indexOf(userId);

        if (index === -1) {
            // Not liked yet — add like
            post.likes.push(userId);
        } else {
            // Already liked — remove like
            post.likes.splice(index, 1);
        }

        await post.save();
        res.redirect("/profile");
    } catch (err) {
        res.status(500).send("Something went wrong while liking the post");
    }
});

app.get("/edit/:id", isLoggedIn, async function (req, res) {
    let post=await postModel.findOne({_id:req.params.id}).populate("user");
    res.render("edit",{post});
});

app.post("/update/:id", isLoggedIn, async function (req, res) {
    let post=await postModel.findOneAndUpdate({_id:req.params.id},{content:req.body.content});
    res.redirect("/profile");
});

app.post("/post", isLoggedIn, async function(req, res) {
    let user = await userModel.findOne({ email: req.user.email });
    let { content } = req.body;

    let post = await postModel.create({
        content,
        user: user._id
    });

    user.posts.push(post._id);
    await user.save();

    res.redirect("/profile");
});

app.get("/logout",function(req,res){
    res.cookie("token","");
    res.redirect("/login");
});

function isLoggedIn(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        return res.redirect("/login");
    }

    try {
        const data = jwt.verify(token, "anime");
        req.user = data;
        next();
    } catch (err) {
        return res.redirect("/login");
    }
}

app.post("/upload", isLoggedIn, upload.single("image"), async function (req, res) {
    if (!req.file) return res.status(400).send("No file uploaded");

    let user = await userModel.findOne({ email: req.user.email });
    user.profilepic = req.file.filename;
    await user.save();

    res.redirect("/profile");
});


/*app.post("/upload",upload.single("image"),function(req,res){
    console.log(req.file);
})*/

app.listen(3000);
