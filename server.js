const express = require('express')
const mysql = require('mysql2')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const Joi = require('joi')
const cookie = require('cookie-parser');
const bcrypt = require('bcrypt')
const multer = require('multer')
const path = require('path')
const fs = require('fs').promises;


const app = express();
const port = 3000;
let secretKey = '#Hemal'


app.set('view engine', 'ejs');

app.use(express.static(__dirname + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookie());

// app.use(cors ({ origin : true }))
app.use(cors());


//////////for profile photo/////////
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/',)
    },
    filename : (req, file, cb) => {
        // console.log("file ",file);
        cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})
const upload = multer({ storage });



/////Joi signupSchema for signup//////
const signupschema = Joi.object({
    first_name : Joi.string().required(),
    last_name : Joi.string().required(),
    phone : Joi.string().required(),
    email : Joi.string().email().required(),
})

const loginschema = Joi.object({
    email : Joi.string().email().required(),
    password : Joi.string().required(),
})




///////////Data base connection///////
let connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "#Hemal",
    database: "twitter_clone"
})

connection.connect(function(err){
    if(err){
        console.log('Error in Database connection ',err);
    }else{
        console.log("connection created successfully with twitter_clone");
    }
})






const generateTokenSignup = async (f_name, l_name, phone ,email) => {
    const token = jwt.sign({
        first_name : f_name,
        last_name : l_name,
        phone : phone,
        email : email,
    }, secretKey, {expiresIn : '24h' })
     return token;
} 

const generateTokenLogin = async (id,f_name, l_name, phone ,email) => {
    const token = jwt.sign({
        user_id : id,
        first_name : f_name,
        last_name : l_name,
        phone : phone,
        email : email,
    }, secretKey, {expiresIn : '24h' })
     return token;
} 



let authMiddleware = async  (req, res, next) => {

        let authToken = req.cookies;  // => Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJmaXJzdF9uYW1lIjoiSGVtYWwiLCJsYXN0X25hbWUiOiJCaGF0dGkiLCJlbWFpbCI6ImhlbWFsQGdtYWlsLmNvbSIsImlhdCI6MTc0MTIzMzM1MywiZXhwIjoxNzQxMzE5NzUzfQ.N0HOAOFXVu_VjxhK4j8_FOROWAExwuR30TF0_2gzeDA
    

        if(!(authToken.Token ||  authToken.LoginToken)) {
            return res.redirect('/');
        }


        if(authToken.LoginToken){
            try {
                let decoded = jwt.verify(authToken.LoginToken, secretKey);
                req.user = decoded;
                console.log('Yes, User is authenticated');
               return next();
            } catch (error) {
                return res.status(400).json({ msg : 'Invalid or expired token' });
            }
        }
        
    
    try {
        let decoded = jwt.verify(authToken.Token, secretKey);
        req.user = decoded;
        console.log('Yes, User is authenticated');
       return next();
    } catch (error) {
        return res.status(400).json({ msg : 'Invalid or expired token' });
    }
}


const hashPassword = async (userPassword) => {
    try {
        const saltRounds = 10; // Define salt rounds
        const hash = await bcrypt.hash(userPassword, saltRounds);
        return hash;
    } catch (err) {
        console.error('Error hashing password:', err);
        throw err;
    }
};



////////public route////////
app.get('/', (req,res) => {
    res.render('./signup')
})
app.get('/blankscreen', (req,res) => {
    res.render('./blankscreen')
})

app.get('/login', async(req,res) => {
    res.render('./login')
})




//////////////////////protected route////////////////
app.get('/deshboard',authMiddleware,(req,res) => {
    res.render('./deshboard')
})


app.get('/check',authMiddleware ,(req,res) => {
    try {
        return res.status(200).json({msg:'Valid user '})
    } catch (error) {
        return res.status(400).json({msg:'Invalid user '})
    }
})


app.get('/setpassward', authMiddleware ,async (req,res) => {
    res.render('./setPassward')
})

app.post('/setpassward', authMiddleware, async (req,res) => {
    let passwards = req.body;
    let userData = req.user;
    // console.log('ddddddddddddaaaaaata',userData);
    // { passward: '#hemalbhatti', re_passward: '#hemalbhatti' }
   
    if(passwards.passward !== passwards.re_passward){
        return res.status(405).json({
            msg : "please enter same passward in both field"
        })
    }
    
    let hashedPassword = await hashPassword(passwards.passward);


    let insertIntoTwitter_login = `insert into twitter_clone.twitter_login
    (email, passward)
    values 
    ('${userData.email}','${hashedPassword}')
     `

     let loginInfoPromise = new Promise((res, rej) => {
        connection.query(insertIntoTwitter_login, (err, result) => {
            if(err){
                return rej(err)
            }else{
                return res(result)
            }
        })
    }) 


    ///clear existed cookies//
    res.clearCookie("Token");

    

    try {
        let result = await loginInfoPromise;

        return res.status(200).json({

            data : result,
            msg : "User is ready to log in !!"
        })

    } catch (error) {
        return res.status(401).json({
            msg : "Data is not inserted into twitter login!"
        })
    }
 
})


app.get('/twitts', authMiddleware,(req,res) => {
    res.render('./twitts', { data : req.user })
})


app.get('/allpost', authMiddleware, (req,res) => {
    res.render('./allpost')
})

app.get('/retweet', authMiddleware, (req,res) => {
    res.render('./retweet')
})

app.get('/viewprofile', authMiddleware, (req,res) => {
    res.render('./viewprofile')
})



////////signup user /////entry in database/////
app.post('/signup/user',upload.any(), async (req,res) => {

    let signupData = req.body;
    let file = req.files;
    // console.log(file);
    
    const {error, value} = signupschema.validate(signupData)

    console.log("value of validation is : ",{ val : value });

    if (error) {

        console.log('inside error of image..');

        console.log('error is in joi', error.details[0].message);
            if(file){
                console.log('file is not uploaded!');
                await fs.unlink(file[0].path)
            }
    
            return res.status(400).json({
                data : error.details[0].message,
                msg : "validation Failed!"
            })
        }

        
    let insertSignupInfo = `insert into twitter_clone.twitter_user
    (first_name, last_name,phone_number,email, profile_picture)
    values 
    ('${signupData.first_name}','${signupData.last_name}','${signupData.phone}','${signupData.email}','${file[0].path}')
    `

    let signupInfoPromise = new Promise((res, rej) => {
        connection.query(insertSignupInfo, (err, result) => {
            if(err){
                return rej(err)
            }else{
                return res(result)
            }
        })
    })

    let generatesignUpToken = await generateTokenSignup(signupData.first_name, signupData.last_name, signupData.phone, signupData.email)

    if(!generatesignUpToken){
        return res.status(404).json({
            msg : "error in Token generating token!"
        })
    }

    try {
        let result = await signupInfoPromise;

        return res.status(200).json({
            data : generatesignUpToken,
            msg : "User is signed up !!"
        })

    } catch (error) {

        // also need to remove from here..
        if(file){
            console.log('file is not uploaded!');
            await fs.unlink(file[0].path)
        }

        return res.status(401).json({
            msg : `Data is not inserted into twitter user!${error}`
        })
    }
    
})



app.post('/login/user', async (req,res) => {

    let data = req.body
    console.log(data);

    const {error, value} = loginschema.validate(data)

    if(error) {
        return res.status(400).json({
            msg : error.details[0].message,
        })
    }

    let email = data.email;
    let subPassward = data.password;


    let checkForValidUser = `select * from twitter_clone.twitter_login where email = '${email}'`

    let checkForValidUserPromise = new Promise((res, rej) => {
        connection.query(checkForValidUser, (err, result) => {
            if(err){
                return rej(err)
            }else{
                return res(result)
            }
        })
    })

   

    
       let check = await checkForValidUserPromise;

        if(check.length == 0){
            return res.status(404).json({
                msg : "user in not valid!"
            })
        }
       
       let dbPassward = check[0].passward;


       let passwardCheck = await bcrypt.compare(subPassward,dbPassward);
       

       if(passwardCheck) {


        let selectFromTwitterUser = `select * from twitter_clone.twitter_user where email = '${data.email}'`
        
        let selectUserInfoPromise = new Promise((res, rej) => {
            connection.query(selectFromTwitterUser, (err, result) => {
                if(err){
                    return rej(err)
                }else{
                    return res(result)
                }
            })
        })


    

    try {
        let result = await selectUserInfoPromise;

        let generateLoginToken = await generateTokenLogin(result[0].user_id, result[0].first_name, result[0].last_name, result[0].phone, result[0].email)

        if(!generateLoginToken){
            return res.status(404).json({
                msg : "error in Token generating token during login times!"
            })
        }

    ///add new cookies at login time//////
    res.cookie('LoginToken',generateLoginToken);

        return res.status(200).json({

            data : generateLoginToken,
            msg : "User is Loged in !!"
        })

    } catch (error) {
        return res.status(401).json({
            msg : "Data is not inserted into twitter login!", error
        })
    }

       }else{
            return res.status(401).json({
                msg : "Invalid Credentials!"
            })
       }
})




/////////////////////////listing all users/////////////////////////
app.get('/deshboard/list/getdata', authMiddleware ,async (req,res) => {

    let data = req.user;
    let currentpage = req.query.page || 1;
    
    if(currentpage <= 1){
        currentpage = 1;
    }
    let pageSize = 10;
    let offset = ( currentpage - 1 )*pageSize;

    let yourFollower = `select tu.user_id,tu.first_name,tu.last_name, tu.email
            FROM twitter_user as tu
            JOIN twitter_follow as tf
            ON user_id = whomtofollow_id
            WHERE tf.whoisfollow_id = ${data.user_id};`

        const yourFollowerPromise = new Promise( (res, rej) => {
            connection.query(yourFollower, (err,result) => {
                if(err){ 
                    return rej(err)
                }
                    return res(result);
            })
        })


    let selectInJobUser = 
            `
            select tu.user_id,tu.first_name,tu.last_name,tu.email
            FROM twitter_user as tu
            LEFT JOIN twitter_follow as tf
            ON tu.user_id = tf.whomtofollow_id
            WHERE tu.user_id not in (select tue.user_id
            FROM twitter_user as tue
            JOIN twitter_follow as tfe
            ON tue.user_id = tfe.whomtofollow_id
            WHERE tfe.whoisfollow_id = ${data.user_id}) 
            AND tu.user_id != ${data.user_id}
            GROUP BY user_id
            LIMIT ${pageSize} 
            OFFSET ${offset};
            `
            const selectUserPromise = new Promise( (res, rej) => {
                connection.query(selectInJobUser, (err,result) => {
                    if(err){ 
                        return rej(err)
                    }
                     return res(result);
                })
            })
            
            
    let totalJobUser = `select count(*) as cnt from twitter_user WHERE user_id not in (select tu.user_id
            FROM twitter_user as tu
            JOIN twitter_follow as tf
            ON user_id = whomtofollow_id
            WHERE tf.whoisfollow_id = ${data.user_id})
            AND user_id != ${data.user_id};`

    
    const countUserPromise = new Promise( (res, rej) => {
        connection.query(totalJobUser, (err,result) => {
            if(err){
                return rej(err)
            }
             return res(result);
        })
    })


    try {
        
            let result1 = await selectUserPromise;
            let result2 = await countUserPromise;
            

            let totalPage = Math.ceil(result2[0].cnt / pageSize);
            let yourFollower = await yourFollowerPromise;
        
            res.send({
                data : {
                    yourFollower : yourFollower,
                    currentpage : currentpage,
                    userDetail : result1,   
                    totalData : result2,
                    totalPage : totalPage
                }
            })
    } catch (error) {

            let deleteIntoLikes = `delete from twitter_clone.twitter_follow 
            where whoisfollow_id = ${req.user.user_id} AND whomtofollow_id = ${data.user_id}`

            let deleteFollowPromise = new Promise((res, rej) => {
                connection.query(deleteIntoLikes, (err, result) => {
                    if(err){
                        return rej(err)
                    }else{
                        return res(result)
                    }
                })
            })

            try {
                let postData = await deleteFollowPromise;
                return res.status(200).json({

                    postData: postData,
                
                    msg: "unfollow successfully"
                });
            
            } catch (error) {
                return res.status(401).json({
                    msg : "error unfollowing"
                })
            }
        }
})



///////////////////////////Create a new Follower////////////////////////
app.post('/deshboard/list/follow', authMiddleware, async (req,res) => {

    // console.log(req.body.whomfollow_id);
    // console.log(req.user);

    let insertIntotwitter_follow = `insert into twitter_clone.twitter_follow 
    (whoisfollow_id, whomtofollow_id)
    values
    ('${req.user.user_id}','${req.body.whomfollow_id}')
    `

    let insertFollowPromise = new Promise((res, rej) => {
        connection.query(insertIntotwitter_follow, (err, result) => {
            if(err){
                return rej(err)
            }else{
                return res(result)
            }
        })
    })

    try {
        let result = await insertFollowPromise;

        return res.status(200).json({
            data : result,
            msg : "follow successfull!!"
        })

    } catch (error) {
        
    let deleteIntoLikes = `delete from twitter_clone.twitter_follow 
    where whoisfollow_id = ${req.user.user_id} AND whomtofollow_id = ${req.body.whomfollow_id}`

    let deleteFollowPromise = new Promise((res, rej) => {
        connection.query(deleteIntoLikes, (err, result) => {
            if(err){
                return rej(err)
            }else{
                return res(result)
            }
        })
    })

    try {
        let postData = await deleteFollowPromise;
        return res.status(200).json({

            postData: postData,
           
            msg: "unfollow successfully"
        });
      
    } catch (error) {
        return res.status(401).json({
            msg : "error unfollowing"
        })
    }
    }

})



//////////////////////////add new twittes/////////////////////////
app.post('/deshboard/new/twitts' ,authMiddleware, upload.any(), async (req,res) => {

    let file = req.files;
    console.log(file);

    let insertIntoUser_twittes = `insert into twitter_clone.twitter_create_post 
    (user_id, twitts_data, post_picture)
    values
    ('${req.user.user_id}','${req.body.twitts}','${file[0].path}' )`


    let insertUser_twittesPromise = new Promise((res, rej) => {
        connection.query(insertIntoUser_twittes, (err, result) => {
            if(err){
                return rej(err)
            }else{
                return res(result)
            }
        })
    })

    try {
        let user_twittes = await insertUser_twittesPromise;

        return res.status(200).json({

            data : user_twittes,
            msg : "post succesfully!!"
        })
    
    } catch (error) {

        if(file){
            console.log('file is not uploaded!');
            await fs.unlink(file[0].path)
        }

        return res.status(401).json({
            msg : "error in insert into user_twittes!"
        })
    }

})



////////////////////////get all twites/////////////
app.get('/deshboard/all/twitts', authMiddleware, async(req,res) => {
    
    let currUser = req.user;

    let selectallPostData = `
    SELECT 
    tcp.post_id,
    tcp.twitts_data AS post_content,
    tu.user_id AS user_id,
    tu.first_name AS first_name,
	tu.last_name AS last_name,
    tu.email AS email,
    tu.profile_picture  profile,
    tcp.created_at AS post_date,
    tcp.post_picture AS post_picture,
    COUNT(pl.like_id) AS like_count
    FROM 
        twitter_create_post as tcp
    LEFT JOIN 
        twitter_user as tu ON tcp.user_id = tu.user_id
    LEFT JOIN 
        post_like as pl ON tcp.post_id = pl.postlike_id
    WHERE 
        tu.is_deleted = 1 
    GROUP BY 
        tcp.post_id
    ORDER BY 
    tcp.created_at DESC;
    `


    let selectUser_twittesPromise = new Promise((res, rej) => {
        connection.query(selectallPostData, (err, result) => {
            if(err){
                return rej(err)
            }else{
                return res(result)
            }
        })
    })

    
    try {
        
        let postData = await selectUser_twittesPromise;
        
        // let date = moment(`${postData[1].post_date}`).fromNow();
        // console.log(date);

        return res.status(200).json({

            postData: postData,
            msg: "all post data fetch successfully"
        });
      
    } catch (error) {
        return res.status(401).json({
            msg : "error fetching all post!"
        })
    }

})





//////////////////////////////adding a like//////////////////////////////
app.post('/deshboard/all/twitts/likes', authMiddleware, async(req,res) => {
    
    let data = req.body;

    let insertIntoLikes = `insert into twitter_clone.post_like 
    (wholike_id, postlike_id)
    values
    ('${req.user.user_id}','${data.post_id}')
    `

   


    let InsertLikesPromise = new Promise((res, rej) => {
        connection.query(insertIntoLikes, (err, result) => {
            if(err){
                return rej(err)
            }else{
                return res(result)
            }
        })
    })


    let likeCnt = `
    SELECT postlike_id, COUNT(*) AS cnt
    FROM post_like
    where postlike_id = ${data.post_id}
    GROUP BY postlike_id;`


    let likeForPost = new Promise((res, rej) => {
        connection.query(likeCnt, (err, result) => {
            if(err){
                return rej(err)
            }else{
                return res(result)
            }
        })
    })

    try {
        let insertLike = await InsertLikesPromise;
        let likes = await likeForPost;
        return res.status(200).json({
            data: insertLike,
            likes : likes,
            msg: "likes successfully"
        });
    } catch (error) {
        // return res.status(401).json({
        //     msg : "you can not like again!"
        // })

        let deleteIntoLikes = `delete from twitter_clone.post_like 
        where wholike_id = ${req.user.user_id} AND postlike_id = ${data.post_id} `
    
        let deleteLikesPromise = new Promise((res, rej) => {
            connection.query(deleteIntoLikes, (err, result) => {
                if(err){
                    return rej(err)
                }else{
                    return res(result)
                }
            })
        })


        let likeCnt = `
        SELECT postlike_id, COUNT(*) AS cnt
        FROM post_like
        where postlike_id = ${data.post_id}
        GROUP BY postlike_id;`


        let likeForPost = new Promise((res, rej) => {
            connection.query(likeCnt, (err, result) => {
                if(err){
                    return rej(err)
                }else{
                    return res(result)
                }
            })
        })

        try {
            let insertLike = await deleteLikesPromise;
            let likes = await likeForPost;

            return res.status(200).json({
                data: insertLike,
                likes : likes,
                msg: "dislike successfully"
            });
            
        } catch (error) {
            return res.status(401).json({
                msg : "you can not like again! or dislike"
            })
        }
    }
})



/////////////////////////////add reTweet in post////////////////////
app.post('/deshboard/all/retweet', authMiddleware, async(req,res) => {

    let data = req.body; // { user_id: '54', post_id: '10' }
    // console.log(data);
    let currUser = req.user;
    // console.log(currUser);
    let insertIntoRetweet = `insert into twitter_clone.reTweet
    (whichpost_id,post_user_id ,who_retweet_id, retweet_data)
    values
    ('${data.post_id}','${data.user_id}','${currUser.user_id}','${data.reTweetData}')
     `


    let insertIntoRetweetPromise = new Promise((res, rej) => {
        connection.query(insertIntoRetweet, (err, result) => {
            if(err){
                return rej(err)
            }else{
                // console.log('Data is inserted into a reTweet');
                return res(result)
            }
        })
    })


    try {
        let insertToreTweet = await insertIntoRetweetPromise;
        res.status(200).json({
            msg : 'Data is inserted into a reTweet..'
        })
    
    } catch (error) {
        res.status(400).json({
            msg : "You can not retweet again on same post"
        })
    }
    
})



/////////////////////////////display all reTweets//////////////////////
app.get('/deshboard/allretweet', authMiddleware, async (req,res) => {

    let selectAllRetweet = `select  tuser.user_id, tuser.first_name, tuser.last_name, post.twitts_data, rt.whichpost_id, rt.retweet_data ,rt.post_user_id, rt.who_retweet_id, post.post_picture ,rt.created_at as reTweetTime, post.created_at as tweetTime
                            from reTweet as rt
                            inner join  twitter_create_post as post
                            on rt.whichpost_id = post.post_id
                            join twitter_user as tuser
                            on post.user_id = tuser.user_id
                            ORDER BY rt.created_at DESC;
                            `


    let selectRetweetPromise = new Promise((res, rej) => {
        connection.query(selectAllRetweet, (err, result) => {
            if(err){
                return rej(err)
            }else{
                // console.log('Data is selcted from reTweet');
                return res(result)
            }
        })
    })


    try {
        let selelctToreTweet = await selectRetweetPromise;
        // console.log(selelctToreTweet);

        res.status(200).json({
            data : selelctToreTweet,
            msg : 'Data is selected from reTweet..'
        })
    } catch (error) {
        res.status(400).json({
            msg : `${error.message}`
        })
    }


})


///////////////////////view Profile/////////////////////////////////
app.get('/deshboard/viewprofile', authMiddleware, async(req,res) => {

    let id = req.query.user_id;
        if(id == 'myProfile'){
            id = req.user.user_id;
        }
    let selectFromUser = `select * from twitter_user where user_id=${id}`;

    let selectUserPromise = new Promise((res, rej) => {
        connection.query(selectFromUser, (err, result) => {
            if(err){
                return rej(err)
            }else{
                // console.log('Data is selcted from reTweet');
                return res(result)
            }
        })
    })

    let followerCntSql = `select count(*) as cnt from twitter_follow where whomtofollow_id = ${id};`

    let followerCntPromise = new Promise((res, rej) => {
        connection.query(followerCntSql, (err, result) => {
            if(err){
                return rej(err)
            }else{
                // console.log('Data is selcted from reTweet');
                return res(result)
            }
        })
    })


    let followingCntSql = `select count(*) as cnt from twitter_follow where whoisfollow_id = ${id}; `

    let followingCntPromise = new Promise((res, rej) => {
        connection.query(followingCntSql, (err, result) => {
            if(err){
                return rej(err)
            }else{
                // console.log('Data is selcted from reTweet');
                return res(result)
            }
        })
    })


    try {
        let selelctUser = await selectUserPromise;
        let followerCnt = await followerCntPromise;
        let followingCnt = await followingCntPromise

        res.status(200).json({
            data : {
                selelctUser : selelctUser,
                followerCnt : followerCnt,
                followingCnt : followingCnt
            },

            msg : 'Data is selected from user Details..'
        })
    } catch (error) {
        res.status(400).json({
            msg : `${error.message}`
        })
    }

})



//////get only follower & following user details inside view Profile.///////
app.get('/deshboard/viewprofile/follow-following-data', authMiddleware, async(req,res) => {

    let user_id = req.query.user_id;
    let string = req.query.string;

    if(string === 'following') {

    let yourFollower = `select tu.user_id,tu.first_name,tu.last_name, tu.email
            FROM twitter_user as tu
            JOIN twitter_follow as tf
            ON user_id = whomtofollow_id
            WHERE tf.whoisfollow_id = ${user_id};`

        const yourFollowerPromise = new Promise( (res, rej) => {
            connection.query(yourFollower, (err,result) => {
                if(err){ 
                    return rej(err)
                }
                    return res(result);
            })
        })

            try {  


                let followerData = await yourFollowerPromise;

                res.status(200).json({
                    data : followerData,
                    msg : 'data of user"s follower'
                })
                

            } catch (error) {
                res.status(400).json({
                    msg : `${error.message}`
                })
            }
    }
    else if(string === 'follower'){

        let yourfollowing = `select tu.user_id,tu.first_name,tu.last_name, tu.email
            FROM twitter_user as tu
            JOIN twitter_follow as tf
            ON user_id = whoisfollow_id
            WHERE tf.whomtofollow_id
             = ${user_id};`

        const yourfollowingPromise = new Promise( (res, rej) => {
            connection.query(yourfollowing, (err,result) => {
                if(err){ 
                    return rej(err)
                }
                    return res(result);
            })
        })

            try {  


                let followeringData = await yourfollowingPromise;

                res.status(200).json({
                    data : followeringData,
                    msg : 'data of user"s following'
                })
            

            } catch (error) {
                res.status(400).json({
                    msg : `${error.message}`
                })
            }
    }
    
})





app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
})











