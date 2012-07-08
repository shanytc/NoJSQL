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
				this.err('no select fields found in the sql query: "' + this.getSQL()+'"');
				return null;
			}
			// Get 'from'
			if(this.trim(sql[2].toLowerCase())!='from'){
				this.err('missing \'from\' in your sql query: "' + this.getSQL()+'"');
				return null;
			}
			from = this.parseSqlFromTable(sql); // get table name
			if(columns == null){
				this.err('missing \'table name\' found in the sql query: "' + this.getSQL()+'"');
				return null;
			}
			
			// WHERE is [optional]

			// ORDER BY is [optional]

			db_data = this.getDataFromDB(from,columns);
			if(db_data.length){
				return db_data;
			}

			return null;
		} // end of SELECT Statement
	}
}