var nojsql = {
	db: null,
	table: null,
	sql: null,
	errors:[],
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
			str = str.replace(/^\s+|\s+$/g, '');
			str = str.replace(/\s{2,}/g, ' ');
			return str;

		}
		return null;
	},
	setTable: function(table){ this.table = table; },
	getTable: function(){ return this.table; },
	getSQL: function(){ return this.sql; },
	setSQL: function(sql){ this.sql = sql; },
	fixSQL: function(){
		sql = this.getSQL().replace(/, /ig,',');
		sql = sql.replace(/(\r\n|\n|\r)/gm,"");
		this.setSQL(sql);
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
	assert	: function(val){

	},
	getFieldsBySql : function(sql){
		if(typeof sql != "undefined" && sql.length){
			this.sql = this.trim(sql).toLowerCase();
			this.fixSQL(); // make sure sql is valid
			return this.parseSQL();
		}
		return [];
	},
	parseSQL : function(){
		console.log('Parsing: \''+this.getSQL()+'\'...');

		// FROM Statement
		from = this.getFromClause(sql); // sets the current working table
		if(!this.testTableAgainstDB()){
			return [];
		}

		// Statement
		select = this.getSelectClause(sql); // get the columns (or *) in the SELECT <...> FROM clause
		if(!this.testColumunsAgainstDB()){
			return [];
		}

		// ORDER Statement
		orderby = this.getOrderBy();
		limit = this.getLimit();
		
		console.log(select,from,orderby,limit);
		// return data
		return []; // remove this line
	},
	testColumunsAgainstDB: function(){
		return true; // remove this line
	},
	testTableAgainstDB: function(){
		db = this.getDB();
		table = this.getTable();
		if(!(typeof db[table] != "undefined" && db[table].length)){
			this.errors.push('table \''+table+'\' does not exists in selected db');
			console.error('table \''+table+'\' does not exists in selected db');
			return false;
		}
		return true;
	},
	getLimit: function(){
		sql = this.getSQL();
		var regex=/limit\s[0-9]+\;/g;
		if(!regex.test(sql)){
			this.errors.push('missing limit <> in selected query');
			console.error('missing limit <> columns in selected query');
			return [];
		}
		var limit = this.trim(sql.match(regex)[0].replace(/limit/,'').replace(/;/,''));
		if(!(typeof orderby != "undefined" && orderby.length)){
			this.errors.push('missing limit <> in selected query');
			console.error('missing limit <> columns in selected query');
			return [];
		}
		return limit;
	},
	getOrderBy: function(){
		sql = this.getSQL();
		sql=sql.replace(/fields\s(.*)/g,'');
		sql=sql.replace(/limit\s(.*)/g,'');

		var regex=/order\sby\s.*/g;
		if(!regex.test(sql)){
			this.errors.push('missing order by columns in selected query');
			console.error('missing order by columns in selected query');
			return [];
		}
		var orderby = this.trim(sql.match(regex)[0].replace(/order\sby/,''));
		if(!(typeof orderby != "undefined" && orderby.length)){
			this.errors.push('missing order by columns in selected query');
			console.error('missing order by columns in selected query');
			return [];
		}
		newOrderBy = [];
		orderby = orderby.split(',');
		for(i=0;i<orderby.length;i++){
			order = orderby[i].split(' ');
			if(order.length){
				o=1;
				if(order[1]=='desc'){
					o=0;
				}
				newOrderBy.push([i,o]);
			}else{
				newOrderBy.push([i,1]);
			}
		}
		if(!(typeof newOrderBy != "undefined" && newOrderBy.length)){
			this.errors.push('missing order by columns in selected query');
			console.error('missing order by columns in selected query');
			return [];
		}

		return newOrderBy;
	},
	getFromClause: function(){ // FROM <table>
		sql = this.getSQL();
		// eliminate potential fallin in 'table' names.
		sql=sql.replace(/order\sby(.*)/g,'');
		sql=sql.replace(/inner\sjoin(.*)/g,'');
		sql=sql.replace(/where\s(.*)/g,'');
		sql=sql.replace(/limit\s(.*)/g,'');

		var regex=/from\s[a-z0-9A-Z]+/g;
		if(!regex.test(sql)){
			this.errors.push('missing <table> name in selected query');
			console.error('missing <table> name in selected query');
			return [];
		}
		var table = this.trim(sql.match(regex)[0].replace(/from/,''));
		if(typeof table != "undefined" && table.length){
			this.setTable(table);
			return table;
		}

		this.errors.push('missing <table> name in selected query');
		console.error('missing <table> name in selected query');
		return [];
	},
	getTableColumns: function(){
		db = this.getDB();
		table = this.getTable();

		for (data in db[table]){
			for(info in db[table][data]){
				//columnPositions.push(info);
				columns.push(info);
			}
		}
		if(!columns.length){
			return [];
		}

		columns = this.findDuplicates(columns);
		return columns;
	},
	getSelectClause: function(){
		columns=[];
		sql = this.getSQL();
		var regex=/^select\s(.*)\sfrom\s/g;
		if(!regex.test(sql)){
			return [];
		}
		var select = this.trim(sql.match(regex)[0].replace(/select/,'').replace(/from/,''));
		if(!select.length){
			return [];
		}

		if(select=='*'){
			// get all columns from the db[selected table]
			columns = this.getTableColumns();
		}else{
			columns = select.split(',');
			for(i=0;i<columns.length;i++){ // lower case all fields
				columns[i] = this.trim(columns[i].toLowerCase());
			}
		}
		return columns; // remove this line
	}
};

/*
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
					case "limit":{

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
*/

