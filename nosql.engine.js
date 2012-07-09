var nsql = {
	db : null,
	sql: null,
	setDB: function(db){
		if(typeof db != "undefined"){
			this.db = db;
			return;
		}
		this.err('no db specified');
		return null;
	},
	getDB : function (){ return this.db; },
	trim : function(str){
		if(typeof str != "undefined" && str.length){
			return str.replace(/^\s+|\s+$/g, '');
		}
		return null;
	},
	getFieldsBySql : function(sql){
		if(typeof sql != "undefined" && sql.length){
			this.sql = this.trim(sql);
			this.fixSQL(); // make sure sql is valid
			return this.parseSQL();
		}
		return null;
	},
	log: function(log){ console.log(log) },
	err: function(err){ console.error(err) },
	getSQL: function(){ return this.sql; },
	setSQL: function(sql){ this.sql = sql; },
	parseSelectQuery: function(sql){
		show_all_columns=0;
		if(typeof sql[1] != "undefined" && sql[1].length){
			columns = this.trim(sql[1].toLowerCase());
			if(columns=='*'){ // all ffrom ields
				show_all_columns=1;
				columns = ['*'];
			}else{ // custrom from fields
				columns = columns.split(',');
				for(i=0;i<columns.length;i++){ // lower case all fields
					columns[i] = this.trim(columns[i].toLowerCase());
				}
			}
			return [columns,show_all_columns];
		}
		return null;
	},
	findDuplicates: function(arr) {
		 var i,
	      len=arr.length,
	      out=[],
	      obj={};

	  for (i=0;i<len;i++) {
	    obj[arr[i]]=0;
	  }
	  for (i in obj) {
	    out.push(i);
	  }
	  return out;
	},
	parseOrderBy: function(fields,table){
		fields = fields.split(',');
		if(fields.length){
			// test found fields against the columns in our table
			db = this.getDB()[from];
			unique_names=[];
			for (data in db){
				for(colName in db[data]){
					unique_names.push(colName);
				}
				
			} // end of for
			
			unique_names = this.findDuplicates(unique_names);
			errors=[];
			for(f in fields){
				field=fields[f];
				if(unique_names.indexOf(field)==-1)errors.push(field);
			}
			if(!errors.length){
				return [fields,0];
			}

			return [errors,1];
		}

		return null;
	},
	parseSqlFromTable : function(sql){
		if(typeof sql[3] != "undefined" && sql[3].length){
			from = this.trim(sql[3].toLowerCase());
			if(typeof from != "undefined" && from.length){
				return from;
			}
		}
		return null;
	},
	getDataFromDB: function(from, columns){
		db = this.getDB()[from];
		results=[];
		//console.log(db)
		if(columns[1]){ // uses *
			for (data in db){
				results[data]=[];
				counter=0;
				for(info in db[data]){
					results[data][counter] = db[data][info];
					counter++;
				}
			}
		}else{ // by columns
			columns = columns[0];

			for (data in db){
				results[data]=[];
				counter=0;
				for(c in columns){
					colName=columns[c];
					if(typeof db[data][colName] != "undefined"){
						results[data][counter] = db[data][colName];
						counter++;
					}
				}
				
			}
		}
		//console.log(results);
		if(results.length){
			return results;
		}

		return null;
	},
	fixSQL: function(){
		sql = this.getSQL().replace(/, /ig,',');
		this.setSQL(sql);
	},
	parseSQL : function(){
		sql = this.getSQL().split(' ');
		// SELECT Statement
		if(this.trim(sql[0].toLowerCase())=='select'){
			// Get the columns
			columns = this.parseSelectQuery(sql);
			if(columns == null){
				this.err('no select fields found in sql query: "' + this.getSQL()+'"');
				return null;
			}
			// Get 'from'
			if(this.trim(sql[2].toLowerCase())!='from'){
				this.err('missing \'from\' in sql query: "' + this.getSQL()+'"');
				return null;
			}
			from = this.parseSqlFromTable(sql); // get table name
			if(columns == null){
				this.err('missing \'table name\' in the sql query: "' + this.getSQL()+'"');
				return null;
			}
			
			// WHERE is [optional]
			// ORDER BY is [optional]
			// LIMIT X

			if(typeof sql[4] != "undefined" && sql[4].length){
				optional = this.trim(sql[4].toLowerCase());
				
				switch(optional){
					case "order":{
						if( !(typeof sql[5] != "undefined" && sql[5].length && this.trim(sql[5].toLowerCase())=='by') ){
							this.err('missing \'by\' in order field. sql query: "' + this.getSQL()+'"');
							return null;
						}
						if(!(typeof sql[6] != "undefined" && sql[6].length)){
							this.err('missing \'field or fields\' of order by in sql query: "' + this.getSQL()+'"');
							return null;
						}

						orderBy=this.parseOrderBy(sql[6],from);
						if(orderBy[1]){
							orderBy = orderBy[0].join(', ');
							this.err('Unknown column(s) \''+orderBy+'\' in order by at "' + this.getSQL()+'"');
							return null;
						}
					}
					break;
				}
			}
			

			db_data = this.getDataFromDB(from,columns);
			if(db_data.length){
				return db_data;
			}

			return null;
		} // end of SELECT Statement
	}
}