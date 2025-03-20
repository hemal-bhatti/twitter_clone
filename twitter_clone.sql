create database twitter_clone;
use twitter_clone;

create table twitter_user(
	user_id int primary key auto_increment,
    first_name varchar(255),
    last_name varchar(255),
    phone_number varchar(255),
    email varchar(255) unique,
    is_deleted boolean default 1,
    created_at datetime default current_timestamp
);
select * from twitter_user;
create table twitter_follow(

	follow_id int primary key auto_increment,
    whoisfollow_id int,
    foreign key (whoisfollow_id) references twitter_user(user_id),
    whomtofollow_id int,
    created_at datetime default current_timestamp,
    unique(whoisfollow_id, whomtofollow_id)
    
);

select * from twitter_follow where whomtofollow_id = 58;


create table twitter_create_post(
	post_id int primary key auto_increment,
    user_id int,
    foreign key (user_id) references twitter_user(user_id),
    twitts_data varchar(255),
    created_at datetime default current_timestamp
);



create table post_like(
	like_id int primary key auto_increment,
    wholike_id int,
    foreign key (wholike_id) references twitter_user(user_id),
    postlike_id int,
    foreign key (postlike_id) references twitter_create_post(post_id),
	unique(wholike_id, postlike_id)
);
drop table post_like;
select * from post_like;
-- truncate table reTweet;	
create table reTweet(
	reTweet_id int primary key auto_increment,
    whichpost_id int,
    post_user_id int,
    who_retweet_id int,
    foreign key(whichpost_id) references twitter_create_post(post_id),
	foreign key(post_user_id) references twitter_create_post(user_id),
    foreign key(who_retweet_id) references twitter_user(user_id),
    retweet_data varchar(255),
    unique(who_retweet_id,whichpost_id),
    created_at datetime default current_timestamp
);
select * from reTweet;



select tuser.user_id, tuser.first_name, tuser.last_name, post.twitts_data, rt.whichpost_id, rt.retweet_data ,rt.post_user_id, rt.who_retweet_id
from reTweet as rt
inner join  twitter_create_post as post
on rt.whichpost_id = post.post_id
join twitter_user as tuser
on post.user_id = tuser.user_id
ORDER BY rt.created_at DESC;



select post.user_id, tuser.first_name, post.twitts_data from twitter_create_post as post
inner join twitter_user as tuser
on tuser.user_id = post.user_id
where post_id = 6;

create table twitter_login(
	login_id int primary key auto_increment,
	email varchar(255) unique,
    foreign key (email) references twitter_user(email),
    passward varchar(255),
    is_deleted boolean default 1,
    created_at datetime default current_timestamp
);





	select  tuser.user_id, tuser.first_name, tuser.last_name, post.twitts_data 
    from twitter_user as tuser
	inner join  twitter_create_post as post
    on tuser.user_id = 54 and post.post_id = 10;
    
    -- on post.user_id = tuser.user_id;
    
    -- select  tuser.user_id, tuser.first_name, tuser.last_name, post.twitts_data 


	select likes.postlike_id, COUNT(*) AS cnt, tuser.user_id, post.post_id,twitts_data,first_name,last_name
    from post_like as likes 
    left join twitter_user as tuser
    on tuser.user_id = likes.wholike_id
    left join twitter_create_post as post
    on post.post_id = likes.postlike_id
    GROUP BY likes.postlike_id
	ORDER BY post.created_at DESC;
     
     
     
     
SELECT postlike_id, COUNT(*) AS like_cnt
FROM post_like
GROUP BY postlike_id;


select * from twitter_follow where whoisfollow_id = 55;
   
    
   



SELECT postlike_id, COUNT(*) AS cnt
FROM post_like
where postlike_id = 9
GROUP BY postlike_id;


select * from post_like;

select tu.user_id,tu.first_name,tu.last_name, tu.email, tf.whoisfollow_id
from twitter_user as tu 
left JOIN twitter_follow as tf
on tu.user_id = tf.whomtofollow_id;

select * from twitter_follow ;

			select count(tu.user_id)
            FROM twitter_user as tu
            LEFT JOIN twitter_follow as tf
            ON user_id = whomtofollow_id
            WHERE tu.user_id not in (select tu.user_id
            FROM twitter_user as tu
            JOIN twitter_follow as tf
            ON user_id = whomtofollow_id
            WHERE tf.whoisfollow_id = 59);
            
            
            select tu.user_id,tu.first_name,tu.last_name,tu.email
            FROM twitter_user as tu
            LEFT JOIN twitter_follow as tf
            ON tu.user_id = tf.whomtofollow_id
            WHERE tu.user_id not in (select tue.user_id
            FROM twitter_user as tue
            JOIN twitter_follow as tfe
            ON tue.user_id = tfe.whomtofollow_id
            WHERE tfe.whoisfollow_id = 60)
            AND tu.user_id != 60
            group by user_id;
            
            --  follower..
            select tu.user_id,tu.first_name,tu.last_name, tu.email
            FROM twitter_user as tu
            JOIN twitter_follow as tf
            ON user_id = whoisfollow_id
            WHERE tf.whomtofollow_id = 59;
            
            --  following..
            select tu.user_id,tu.first_name,tu.last_name, tu.email
            FROM twitter_user as tu
            JOIN twitter_follow as tf
            ON user_id = whomtofollow_id
            WHERE tf.whoisfollow_id = 59;
            
            

select * from twitter_user;

select * from twitter_create_post;

select count(*) from twitter_follow where whoisfollow_id = 60;
select count(*) from twitter_follow where whomtofollow_id = 60;

select * from twitter_login;
select * from twitter_user;


drop table twitter_user;


SELECT 
    tcp.post_id,
    tcp.twitts_data AS post_content,
	tu.last_name AS poster_name,
    tcp.created_at AS post_date,
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