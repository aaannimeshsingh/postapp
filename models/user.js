const mongoose=require('mongoose');
mongoose.connect(process.env.MONGO_URI);


const userSchema=mongoose.Schema({
    name:String,
    username:String,
    age:Number,
    password:String,
    email:String,
    profilepic:{
        type:String,
        default:"default.png"
    },
    posts:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"post"
    }]
});

module.exports=mongoose.model("user",userSchema);
