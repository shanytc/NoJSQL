var nsql = {
	db : null,
	sql: null,
	include_headers: true,

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
	log: function(log){ console.log(logs); },
	err: function(err){ console.error(err); },
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
	parseOrderBy: function(sql,table){
		orderByPos=-1;
		for(i=0; i<sql.length ;i++){
			if(this.trim(sql[i].toLowerCase())=="order"){
				orderByPos=i;
				break;
			}
		}

		if(orderByPos==-1){
			return null;
		}
		orderByPos+=2;

		//check for limit clause
		limitPos=-1;
		for(i=0; i<sql.length ;i++){
			if(this.trim(sql[i].toLowerCase())=="limit"){
				limitPos=i;
				break;
			}
		}
		if(limitPos==-1){
			orderByEnd=sql.length;
		}else{
			orderByEnd=limitPos;
		}
		fields='';
		for(i=orderByPos; i<orderByEnd ;i++){
			fields+=sql[i]+' ';
		}
		fields = this.trim(fields);
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
			sorting=[];
			errors=[];
			for(f in fields){
				field=fields[f];
				field = field.split(' ');
				if(typeof field[1] != "undefined" && field[1].length){ // has asc or dec?
					if(this.trim(field[1].toLowerCase())=='asc'){
						sorting.push({'field':field[0],'pos':1});
					}else{
						sorting.push({'field':field[0],'pos':0});
					}
				}else{ // default sort is always asc
					sorting.push({'field':field[0],'pos':1});
				}
				if(unique_names.indexOf(field[0])==-1)errors.push(field);
			}

			if(!errors.length){
				return [sorting,0];
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
	getDataFromDB: function(from, columns,orderby){
		db = this.getDB()[from];
		results=[];
		columnPositions=[];

		if(columns[1]){ // uses *
			for (data in db){
				results[data]=[];
				counter=0;
				for(info in db[data]){
					columnPositions.push(info);
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
						columnPositions[counter]=colName;
						results[data][counter] = db[data][colName];
						counter++;
					}
				}
				
			}
		}
		
		if(results.length){
			// apply order by if exists
			orderby = orderby.reverse(); // start from the end of the sorting tree
			if(orderby.length){
				for(sort in orderby){
					field=orderby[sort].field;
					byPos = orderby[sort].pos;
					fieldpos = columnPositions.indexOf(field);
					if(fieldpos==-1)continue;

					if(byPos){
						results.sort(function (element_a, element_b) {
						    return element_a[fieldpos].toString() > element_b[fieldpos].toString();
						});
					}else{
						results.sort(function (element_a, element_b) {
						    return element_b[fieldpos].toString() > element_a[fieldpos].toString();
						});
					}
				}
			}
			return [columns,results];
		}

		return null;
	},
	fixSQL: function(){
		sql = this.getSQL().replace(/, /ig,',');
		sql = sql.replace(/(\r\n|\n|\r)/gm,"");
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
				return [];
			}
			// Get 'from'
			if(this.trim(sql[2].toLowerCase())!='from'){
				this.err('missing \'from\' in sql query: "' + this.getSQL()+'"');
				return [];
			}
			from = this.parseSqlFromTable(sql); // get table name
			if(!(typeof this.getDB()[from] != "undefined" && this.getDB()[from].length)){
				return [];
			}
			if(columns == null){
				this.err('missing \'table name\' in the sql query: "' + this.getSQL()+'"');
				return [];
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
							return [];
						}
						if(!(typeof sql[6] != "undefined" && sql[6].length)){
							this.err('missing \'field or fields\' of order by in sql query: "' + this.getSQL()+'"');
							return [];
						}
						orderBy=this.parseOrderBy(sql,from);
						if(orderBy[1]){
							orderBy = orderBy[0].join(', ');
							this.err('Unknown column(s) \''+orderBy+'\' in order by at "' + this.getSQL()+'"');
							return [];
						}
					}
					break;
				}
			}

			db_data = this.getDataFromDB(from,columns,orderBy[0]);
			if(db_data.length){
				return db_data;
			}

			return [];
		} // end of SELECT Statement
	}
}