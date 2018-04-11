var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io=require('socket.io').listen(server);
var MongoClient = require('mongodb').MongoClient; 
var assert = require('assert');
var async = require('async');
var ObjectId = require('mongodb').ObjectID;
var mongourl = 'mongodb://s1141002:159753@ds123658.mlab.com:23658/buildary';
var currentUser={};
app.set('port',process.env.PORT || 8099);


io.on("connection", function(socket){

	socket.on("USER_CONNECT",function(){
		console.log("User connected");
		socket.emit("USER_CONNECTED",{message:'test'});
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
						});
					}
					setTimeout(function () {
					db.close();
					console.log(doc);
					console.log('Disconnected from MongoDB\n');
					for (key in doc) {
						currentUser[key] = doc[key];
					}
					socket.emit("LOGIN",currentUser);
				},2000)
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
			db.collection('user').
				update({'id':user.id},new_user,function(err,doc) {
					assert.equal(err,null);
					db.close();
					console.log('success');
					console.log('Disconnected from MongoDB\n');
					socket.emit("UPDATEUSER",new_user);
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
			console.log(blocks.hasOwnProperty("_id"));
			if(!blocks.hasOwnProperty("_id")){
			db.collection('block').
				update({'createtime': blocks.createtime,'id':blocks.id},new_blocks,{upsert:true},function(err,doc) {
					assert.equal(err,null);
					db.close();
					console.log('success');
					console.log('Disconnected from MongoDB\n');
			});}
			else{
				db.collection('block').
				update({_id: ObjectId(blocks._id)},new_blocks,function(err,doc) {
					assert.equal(err,null);
					db.close();
					console.log('success');
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
			console.log(blocks.hasOwnProperty("_id"));
			if(!blocks.hasOwnProperty("_id")){
			db.collection('block').
				update({'createtime': blocks.createtime,'id':blocks.id},new_blocks,{upsert:true},function(err,doc) {
					assert.equal(err,null);
					db.close();
					console.log('success');
					console.log('Disconnected from MongoDB\n');
			});}
			else{
				db.collection('block').
				update({_id: ObjectId(blocks._id)},new_blocks,function(err,doc) {
					assert.equal(err,null);
					db.close();
					console.log('success');
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
				find({'id':blocks.id,'share':false},{blocks:0}).toArray(function(err,doc) {
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
				find({$or:[{'id':user.id,'share':true},{'Answered':{$regex : ".*"+user.id+".*"}}]},{blocks:0}).toArray(function(err,doc) {
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
				find({'notAnswered':{$regex : ".*"+user.id+".*"},'share':true},{block:0}).toArray(function(err,doc) {
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

server.listen(app.get('port'),function(){
	console.log("---Server Running---");
}); 
