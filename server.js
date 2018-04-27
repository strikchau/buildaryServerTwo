var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io=require('socket.io').listen(server);
var MongoClient = require('mongodb').MongoClient; 
var assert = require('assert');
var async = require('async');
var ObjectId = require('mongodb').ObjectID;
var translate = require('google-translate-api');
var mongourl = 'mongodb://s1141002:159753@ds123658.mlab.com:23658/buildary';
var currentUser={};
app.set('port',process.env.PORT || 8099);


io.on("connection", function(socket){

	socket.on("USER_CONNECT",function(){
		console.log("User connected");
		socket.emit("USER_CONNECTED",{message:'test'});
	});

	socket.on("TOENGLISH",function(word){
		translate(word.word, {from:'zh-TW',to: 'en'}).then(res => {
			console.log(res.text);
			console.log(res.from.language.iso);
			socket.emit("TOENGLISH",{result:res.text});
		}).catch(err => {
			console.error(err);
		});
	});

	socket.on("TOCHINESE",function(word){
		translate(word.word, {from:'en',to: 'zh-TW'}).then(res => {
			console.log(res.text);
			console.log(res.from.language.iso);
			socket.emit("TOCHINESE",{result:res.text});
		}).catch(err => {
			console.error(err);
		});
	});

	socket.on("LOGIN",function(email){
		console.log("User login id:"+email.id);
		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err,null);
			console.log('Connected to MongoDB\n');
			db.collection('users').
				findOne({id: email.id},function(err,doc) {
					assert.equal(err,null);
					if(doc==null){
						var new_user={};
						new_user['id']=email.id;
						new_user['rank_score']=0;
						new_user['previous_work']=[];
						db.collection('users').insertOne(new_user,function(err,result) {
							assert.equal(err,null);
							console.log("Insert was successful!");
							doc=new_user;
							db.close();
							console.log(doc);
							console.log('Disconnected from MongoDB\n');
							for (key in doc) {
								currentUser[key] = doc[key];
							}
							socket.emit("LOGIN",currentUser);
						});
					}
					else{
					db.close();
					console.log(doc);
					console.log('Disconnected from MongoDB\n');
					for (key in doc) {
						currentUser[key] = doc[key];
					}
					socket.emit("LOGIN",currentUser);
				}
				});
		});
	});

	socket.on("GETUSER",function(user){
		console.log("User login id:"+user.id);
		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err,null);
			console.log('Connected to MongoDB\n');
			db.collection('users').
				findOne({id: user.id},function(err,doc) {
					assert.equal(err,null);
					db.close();
					console.log(doc);
					console.log('Disconnected from MongoDB\n');
					socket.emit("GETUSER",doc);
				});
		});
	});

	socket.on("UPDATEUSER",function(user){
		console.log("Update users");
		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err,null);
			console.log('Connected to MongoDB\n');
			var new_user={};
			for (key in user) {
				new_user[key] = user[key];
			}
			db.collection('users').
				update({'id':user.id},new_user,function(err,doc) {
					assert.equal(err,null);
					db.close();
					console.log('success');
					console.log('Disconnected from MongoDB\n');
					socket.emit("UPDATEUSER",new_user);
			});
		});
	});

	socket.on("ADDSCORE",function(user){
		console.log("Add users score by:"+user.score);
		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err,null);
			console.log('Connected to MongoDB\n');
			db.collection('users').
				update({'id':user.user1},{$inc:{'rank_score':user.score}},function(err,doc) {
					assert.equal(err,null);
					db.collection('users').
					update({'id':user.user2},{$inc:{'rank_score':user.score}},function(err,doc) {
						assert.equal(err,null);
						db.close();
						console.log('success');
						console.log('Disconnected from MongoDB\n');
				});
			});
		});
	});

	socket.on("GENERATOR",function(category){
		console.log("Generate word with category:"+category.category);
		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err,null);
			console.log('Connected to MongoDB\n');
			new_data={};
			async.parallel([
				function(finish){
					db.collection('vocabulary').aggregate([
					{$match:{"category":category.category,"difficulty":"easy"}},
					{ $sample: { size: 1 } }],function(err,doc) {
						console.log("random easy success:"+doc[0].vocabulary);
						finish(null,doc[0].vocabulary);
					});
				},
				function(finish){
					db.collection('vocabulary').aggregate([
					{$match:{"category":category.category,"difficulty":"medium"}},
					{ $sample: { size: 1 } }],function(err,doc) {
						console.log("random normal success:"+doc[0].vocabulary);
						finish(null,doc[0].vocabulary);
					});
				},
				function(finish){
					db.collection('vocabulary').aggregate([
					{$match:{"category":category.category,"difficulty":"difficult"}},
					{ $sample: { size: 1 } }],function(err,doc) {
						console.log("random difficult success:"+doc[0].vocabulary);
						finish(null,doc[0].vocabulary);
					});
				}
			],function(err, results){
				console.log(results);
				new_data['easy']=results[0];
				new_data['medium']=results[1];
				new_data['difficult']=results[2];
				console.log(new_data);
				socket.emit("GENERATOR",new_data);
			})
		});
	});
	socket.on("SAVE",function(blocks){
		console.log("Save blocks");
		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err,null);
			console.log('Connected to MongoDB\n');
			var new_blocks={};
			/*new_blocks['createtime']=blocks.createtime;
			new_blocks['email']=blocks.email;
			new_blocks['block']=blocks.block;*/
			for (key in blocks) {
				if(key!='_id')
				new_blocks[key] = blocks[key];
			}
			new_blocks['share'] = false;
			console.log("Has _id:"+blocks.hasOwnProperty("_id"));
			if(!blocks.hasOwnProperty("_id")){
			db.collection('block').
				update({'createtime': blocks.createtime,'id':blocks.id},new_blocks,{upsert:true},function(err,doc) {
					assert.equal(err,null);
					db.close();
					console.log('success new save');
					console.log('Disconnected from MongoDB\n');
			});}
			else{
				db.collection('block').
				update({_id: ObjectId(blocks._id)},new_blocks,function(err,doc) {
					assert.equal(err,null);
					db.close();
					console.log('success update save');
					console.log('Disconnected from MongoDB\n');
				});
			}
		});
	});

	socket.on("SHARE",function(blocks){
		console.log("Share blocks");
		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err,null);
			console.log('Connected to MongoDB\n');
			var new_blocks={};
			for (key in blocks) {
				if(key!='_id')
				new_blocks[key] = blocks[key];
			}
			new_blocks['share'] = true;
			console.log("Has _id:"+blocks.hasOwnProperty("_id"));			
			if(!blocks.hasOwnProperty("_id")){
			db.collection('block').
				update({'createtime': blocks.createtime,'id':blocks.id},new_blocks,{upsert:true},function(err,doc) {
					assert.equal(err,null);
					db.close();
					console.log('success new share');
					console.log('Disconnected from MongoDB\n');
			});}
			else{
				db.collection('block').
				update({_id: ObjectId(blocks._id)},new_blocks,function(err,doc) {
					assert.equal(err,null);
					db.close();
					console.log('success update share');
					console.log('Disconnected from MongoDB\n');
				});
			}
		});
	});

	socket.on("LOADGAMELIST",function(blocks){
		console.log("Load game list");
		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err,null);
			console.log('Connected to MongoDB\n');
			db.collection('block').
				find({'id':blocks.id,'share':false,demo:{ $exists : false }},{block:0}).sort({'createtime':-1}).toArray(function(err,doc) {
					assert.equal(err,null);
					db.close();
					console.log('success');
					console.log('Disconnected from MongoDB\n');
					var newJson={'data':doc};
					socket.emit("LOADGAMELIST",newJson);
			});
		});
	});

	socket.on("REVISION",function(user){
		console.log("Revision game list by id:"+user.id);
		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err,null);
			console.log('Connected to MongoDB\n');
			db.collection('block').
				find({$or:[{'id':user.id,'share':true},{'Answered':{$regex : ".*"+user.id+".*"}}]},{block:0}).sort({'createtime':-1}).toArray(function(err,doc) {
					assert.equal(err,null);
					db.close();
					console.log('success');
					console.log('Disconnected from MongoDB\n');
					console.log(doc);
					var newJson={'data':doc};
					socket.emit("REVISION",newJson);
			});
		});
	});

	socket.on("FINDBYID",function(user){
		console.log("Load game list by userid:"+user.id);
		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err,null);
			console.log('Connected to MongoDB\n');
			db.collection('block').
				find({$or:[{'notAnswered':{$regex : ".*"+user.id+".*"},'share':true},{demo:{ $exists : true }}]},{block:0}).toArray(function(err,doc) {
					assert.equal(err,null);
					db.close();
					console.log('success');
					console.log(doc);
					console.log('Disconnected from MongoDB\n');
					var newJson={'data':doc};
					socket.emit("FINDBYID",newJson);
					console.log("finish emit");
			});
		});
	});

	socket.on("GETWITHDATA",function(id){
		console.log("Get game with data with id:"+id._id);
		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err,null);
			console.log('Connected to MongoDB\n');
			db.collection('block').
			findOne({_id: ObjectId(id._id)},function(err,doc) {
				assert.equal(err,null);
				db.close();
				console.log('success');
				console.log(doc);
				console.log('Disconnected from MongoDB\n');
				socket.emit("GETWITHDATA",doc);
			});
		});
	});
});

app.use(express.static('view'));

app.get('/link',function(req,res) {
	res.writeHead(200, {"Content-Type": "text/html"});
	res.write('<html><head><title>BuildARy related links</title></head>');
	res.write('<body><H1>Related Links</H1>');
	res.write('<ol>');
	res.write('<li><a href="https://drive.google.com/file/d/15zOl2U5M_xnUsj5sjC598cvmT9e1dp3k/view?usp=sharing">Game Download</a></li>');
	res.write('<li><a href="https://drive.google.com/file/d/1lJpf-d8kniVAbz0pyafr8OAx-RBQjEQv/view?usp=sharing">QR code Download</a></li>');
	res.write('<li><a href="https://docs.google.com/forms/d/e/1FAIpQLSfhNMXsPDDTCjtpMsVSL561jLSiG5Sc-5oFQk_RWt0k2Q1RoA/viewform?usp=sf_link">Online Survey</a></li>');
	res.write('</ol>');
	res.end('</body></html>');
});

server.listen(app.get('port'),function(){
	console.log("---Server Running---");
}); 
