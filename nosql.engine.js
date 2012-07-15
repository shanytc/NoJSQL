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
		this.errors = [];
		console.log('Parsing: \''+this.getSQL()+'\'...');

		// FROM Statement
		from = this.getFromClause(sql); // sets the current working table
		if(!this.testTableAgainstDB()){
			return [[],[],this.errors];
		}

		// Statement
		select = this.getSelectClause(sql); // get the columns (or *) in the SELECT <...> FROM clause
		select_errors=this.testColumunsAgainstDB(select);
		if(select_errors.length){
			select_errors = select_errors.join(' and ');
			this.errors.push('Invalid \''+select_errors+'\' column(s) in "select" statement at selected query.');
			console.error('Invalid \''+select_errors+'\' column(s) in "select" statement at selected query.');
			return [[],[],this.errors];
		}

		// ORDER Statement
		orderby = this.getOrderBy();
		if(!orderby.length){
			return [[],[],this.errors];
		}

		// LIMIT
		limit = this.getLimit();
		if(!limit){
			return [[],[],this.errors];
		}
		
		results = this.getDataFromDB(select,from,orderby,limit);
		// return data
		return results; // remove this line
	},
	getDataFromDB: function(select,from,orderby,limit){
		params = [];
		if(!this.getDB()[from].length){
			this.errors.push('Table \''+from+'\' has no data in database!.');
			console.error('Table \''+from+'\' has no data in database!.');
			return [[],[],this.errors];
		}
		db = this.getDB()[from][0];

		for(i=0;i<orderby.length;i++){
			field = orderby[i][0]; // order column
			byPos = orderby[i][1];

			if(byPos){ // asc
				if( typeof db[field] == 'number' ){
					params.push(field);
				}else{
					params.push({name:field,reverse:false});
				}
			}else{
				if( typeof db[field] == 'number' ){
					params.push({name:field,primer: parseInt, reverse:true});
				}else{
					params.push({name:field,reverse:true});
				}
			}

		}

		db = this.getDB()[from].sort(sortby.sort_by(params)); // sort the table
		
		results = [];
		for(j=0;j<db.length;j++){
			data=[];
			for(i=0;i<select.length;i++){
				data.push(db[j][select[i]]);
			}
			results.push(data);
		}

		if(!select.length){
			return [[],[],this.errors];
		}
		
		if(limit>0){
			results = results.slice(0,limit);
		}

		return [select,results,this.errors];
	},
	testColumunsAgainstDB: function(select){

		db = this.getDB()[this.getTable()];
		errors=[];
		for(j=0;j<db.length;j++){
			for(i=0;i<select.length;i++){
				if( !( typeof db[j][select[i]] != "undefined" ) ){
					errors.push(select[i]);
				}
			}
		}
		
		if(errors.length){
			errors = this.findDuplicates(errors);
			return errors;
		}
		return []; // remove this line
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
		var regex=/limit\s([0-9]+\;|[0-9]+)/g;
		if(!regex.test(sql)){
			if(sql.indexOf('limit')!=-1){
				this.errors.push('invalid limit <> in selected query. showing all.');
				console.error('invalid limit <> in selected query. showing all.');
			}
			return -1;
		}
		var limit = this.trim(sql.match(regex)[0].replace(/limit/,'').replace(/;/,''));
		if(!(typeof limit != "undefined" && limit.length)){
			this.errors.push('missing limit <> in selected query, showing all.');
			console.error('missing limit <> in selected query, showing all.');
			return -1;
		}
		return parseInt(limit);
	},
	getOrderBy: function(){
		sql = this.getSQL();
		sql=sql.replace(/fields\s(.*)/g,'');
		sql=sql.replace(/limit\s(.*)/g,'');

		var regex=/order\sby\s.*/g;
		if(!regex.test(sql)){
			this.errors.push('invalid order by statement in selected query');
			console.error('invalid order by statement in selected query');
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
			if(order.length==1 && ( order == "asc" || order == "desc") ){
				this.errors.push('invalid \''+order+'\' in "order by" statement at selected query');
				console.error('invalid \''+order+'\' in "order by" statement at selected query');
				return [];
			}
			if(order.length){
				o=1;
				if(order[1]=='desc'){
					o=0;
				}
				newOrderBy.push([order[0],o]);
			}else{
				newOrderBy.push([order[0],1]);
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
		sql = sql.replace(/from/,' from');
		sql=sql.replace(/order\sby(.*)/g,'');
		sql=sql.replace(/inner\sjoin(.*)/g,'');
		sql=sql.replace(/where\s(.*)/g,'');
		sql=sql.replace(/limit\s(.*)/g,'');
		sql=sql.replace(/fields\sby(.*)/g,'');

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
		sql = sql.replace(/from/,' from');
		var regex=/^select\s(.*)\sfrom\s/g;
		if(!regex.test(sql)){
			this.errors.push('missing select <> fields in selected query');
			console.error('missing select <> fields in selected query');
			return [];
		}
		var select = this.trim(sql.match(regex)[0].replace(/select/,'').replace(/from/,''));
		if(!select.length){
			this.errors.push('missing select <> fields in selected query');
			console.error('missing select <> fields in selected query');
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

// multisort code
var sortby = {
	// utility functions
	default_cmp: function(a, b) {
		if (a == b) return 0;
		return a < b ? -1 : 1;
	},
	getCmpFunc: function(primer, reverse) {
		var cmp = sortby.default_cmp;
		if (primer) {
			cmp = function(a, b) {
				return sortby.default_cmp(primer(a), primer(b));
			};
		}
		if (reverse) {
			return function(a, b) {
				return -1 * cmp(a, b);
			};
		}
		return cmp;
	},

	// actual implementation
	sort_by: function(obj) {
		var fields = [],
		n_fields = obj.length,
		field, name, reverse, cmp;

		// preprocess sorting options
		for (var i = 0; i < n_fields; i++) {
			field = obj[i];
			if (typeof field === 'string') {
				name = field;
				cmp = sortby.default_cmp;
			}
			else{
				name = field.name;
				cmp = sortby.getCmpFunc(field.primer, field.reverse);
			}
			fields.push({
				name: name,
				cmp: cmp
			});
		}

		return function(A, B) {
			var a, b, name, cmp, result;
			for (var i = 0, l = n_fields; i < l; i++) {
				result = 0;
				field = fields[i];
				name = field.name;
				cmp = field.cmp;

				result = cmp(A[name], B[name]);
				if (result !== 0) break;
			}
			return result;
		};
	}
};

