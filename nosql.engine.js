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

		// WHERE
		where = this.getWhere();

		// ORDER Statement
		orderby = this.getOrderBy();
		if(!orderby.length){
			return [[],[],this.errors];
		}

		// LIMIT
		limit = this.getLimit();
		if(limit==-1){
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
					if(db[field]%1!==0){ // float
						params.push({name:field,primer: parseFloat, reverse:false});
					}else{
						params.push(field);
					}
				}else{
					params.push({name:field,reverse:false}); // string
				}
			}else{ // desc
				if( typeof db[field] == 'number' ){
					if(db[field]%1!==0){ // float
						params.push({name:field,primer: parseFloat, reverse:true});
					}else{
						params.push({name:field,primer: parseInt, reverse:true});
					}
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
		
		// limit <x>,<y>
		limit = limit.split(',');
		if(limit.length==1){
			a=0;
			b=parseInt(this.trim(limit[0]),10);
		}else{
			a=parseInt(this.trim(limit[0]),10);
			b=parseInt(this.trim(limit[1]),10);
		}
		
		if(!a && !b){
			results = [];
		}else{
			if(a<b){
				results = results.slice(a,b);
			}else{
				this.errors.push('LIMIT \''+a+'\' must be smaller than \''+b+'\' in selected query. Showing all results.');
				console.error('LIMIT \''+a+'\' must be smaller than \''+b+'\' in selected query. Showing all results.');
			}
		}

		return [select,results,this.errors];
	},
	testColumunsAgainstDB: function(select){

		db = this.getDB()[this.getTable()];
		errors=[];
		for(j=0;j<db.length;j++){
			for(i=0;i<select.length;i++){
				if( typeof db[j][select[i]]=="undefined" ){
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
	getWhere: function(){
		sql = this.getSQL();
		sql = sql.replace(/order\sby(.*)/g,'');
		sql = sql.replace(/limit\s(.*)/g,'');
		sql = sql.replace(/fields\sby(.*)/g,'');

		// temp fix special keywords
		sql = sql.replace(/([0-9]+)\sand\s([0-9]+)/g,'$1#and#$2'); // between

		var regex=/where\s.*/g;
		if(!regex.test(sql)){
			this.errors.push('invalid \'where\' statement in selected query');
			console.error('invalid \'where\' statement in selected query');
			return [];
		}
		var where = this.trim(sql.match(regex)[0].replace(/where\s/,''));
		where = where.split(/and\s/);
		if(!(typeof where != "undefined" && where.length)){
			this.errors.push('missing \'where\' fields in selected query');
			console.error('missing \'where\' fields in selected query');
			return [];
		}

		validCommand = /^(>|=|<|>=|<=|<>|!=|==)$/; // valid WHERE command list
		where_commands = [];

		for (var i = 0; i < where.length; i++) { // loop commands
			w = this.trim(where[i].replace(/#/g,' '));
			w = w.split(' ');
			if(w.length<=2){ // checking for missing value in a command
				if(w.length==2){

					if( /[a-zA-Z]+/g.test(w[0]) && validCommand.test(w[1]) ){
						this.errors.push(w[0]+' is missing value to compare \''+w[1]+'\' with in WHERE clause at selected query (command #'+(i+1)+').');
						console.error(w[0]+' is missing value to compare \''+w[1]+'\' with in WHERE clause at selected query (command #'+(i+1)+').');
					}

					if( validCommand.test(w[1]) === false){
						if( /^-?[0-9]+$/.test(w[1])){
							this.errors.push('\''+w[1]+'\' is in the wrong place, missing a selector at selected query (command #'+(i+1)+').');
							console.error('\''+w[1]+'\' is in the wrong place, missing a selector at selected query (command #'+(i+1)+').');
						}else{
							this.errors.push('\''+w[1]+'\' is an invalid selector in WHERE clause at selected query (command #'+(i+1)+').');
							console.error('\''+w[1]+'\' is an invalid selector in WHERE clause at selected query (command #'+(i+1)+').');
						}
					}
				}
				if(w.length==1){
					// if field is a 'number', than it can be <field> treated as >=1 (true)
					// if this field is a 'string' it can be <field> != ''
					
					// test against table
					db = this.getDB()[this.getTable()]; // get first row
					if( db.length && typeof db[0][w[0]] !== "undefined" ){
						if(typeof db[w[0]] == 'number'){
							w = [w[0],'>=','1'];
						}else{ // assume string
							w = [w[0],'!=',"''"];
						}
						where_commands.push(w);
					}else{
						this.errors.push('\''+w[0]+'\' is an invalid column in table \''+this.getTable()+'\' (WHERE clause command #'+(i+1)+').');
						console.error('\''+w[0]+'\' is an invalid column in table \''+this.getTable()+'\' (WHERE clause command #'+(i+1)+').');
					}
				}
			}else{
				if(w.length==3){ // standard where clause
					if( jQuery.trim(w[2]) === '' ){
						this.errors.push(w[0]+' is missing value to compare \''+w[1]+'\' with in WHERE clause at selected query (command #'+(i+1)+').');
						console.error(w[0]+' is missing value to compare \''+w[1]+'\' with in WHERE clause at selected query (command #'+(i+1)+').');
						continue;
					}

					if( validCommand.test(w[1]) === false){
						if( /^-?[0-9]+$/.test(w[1])){
							this.errors.push('\''+w[1]+'\' is in the wrong place, missing a selector at selected query (command #'+(i+1)+').');
							console.error('\''+w[1]+'\' is in the wrong place, missing a selector at selected query (command #'+(i+1)+').');
						}else{
							this.errors.push('\''+w[1]+'\' is an invalid selector in WHERE clause at selected query (command #'+(i+1)+').');
							console.error('\''+w[1]+'\' is an invalid selector in WHERE clause at selected query (command #'+(i+1)+').');
						}
						continue;
					}

					where_commands.push(w);
				}else{ // special cases or long where clauses (may contain many errors: ie: 'where id >? 5 amd ')
					where_commands.push(w);
				}
			}
			// check for valid where command
			// must have [ column - command - set ] format!?
		}
		if(where_commands.length)
			console.log(where_commands);
	},
	getLimit: function(){
		sql = this.getSQL();
		var regex=/limit\s([0-9]+\;|[0-9]+,[0-9]+\;)/g;
		if(!regex.test(sql)){
			if(sql.indexOf('limit')!=-1){
				this.errors.push('invalid \'limit <>\' in selected query. showing all.');
				console.error('invalid \'limit <>\' in selected query. showing all.');
			}
			return -1;
		}
		var limit = this.trim(sql.match(regex)[0].replace(/limit/,'').replace(/;/,''));
		if(!(typeof limit != "undefined" && limit.length)){
			this.errors.push('missing limit <> in selected query, showing all.');
			console.error('missing limit <> in selected query, showing all.');
			return -1;
		}
		return limit;
	},
	getOrderBy: function(){
		sql = this.getSQL();
		sql=sql.replace(/fields\s(.*)/g,'');
		sql=sql.replace(/limit\s(.*)/g,'');

		var regex=/order\sby\s.*/g;
		if(!regex.test(sql)){
			this.errors.push('invalid \'order by\' statement in selected query');
			console.error('invalid \'order by\' statement in selected query');
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

//
// nojsql extensions //
//

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

var BlobBuilder = BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder || (function(view) {
"use strict";
var
	  get_class = function(object) {
		return Object.prototype.toString.call(object).match(/^\[object\s(.*)\]$/)[1];
	}
	, FakeBlobBuilder = function(){
		this.data = [];
	}
	, FakeBlob = function(data, type, encoding) {
		this.data = data;
		this.size = data.length;
		this.type = type;
		this.encoding = encoding;
	}
	, FBB_proto = FakeBlobBuilder.prototype
	, FB_proto = FakeBlob.prototype
	, FileReaderSync = view.FileReaderSync
	, FileException = function(type) {
		this.code = this[this.name = type];
	}
	, file_ex_codes = (
		  "NOT_FOUND_ERR SECURITY_ERR ABORT_ERR NOT_READABLE_ERR ENCODING_ERR "
		+ "NO_MODIFICATION_ALLOWED_ERR INVALID_STATE_ERR SYNTAX_ERR"
	).split(" ")
	, file_ex_code = file_ex_codes.length
	, realURL = view.URL || view.webkitURL || view
	, real_create_object_URL = realURL.createObjectURL
	, real_revoke_object_URL = realURL.revokeObjectURL
	, URL = realURL
	, btoa = view.btoa
	, atob = view.atob
	, can_apply_typed_arrays = false
	, can_apply_typed_arrays_test = function(pass) {
		can_apply_typed_arrays = !pass;
	}
	
	, ArrayBuffer = view.ArrayBuffer
	, Uint8Array = view.Uint8Array
;
FakeBlobBuilder.fake = FB_proto.fake = true;
while (file_ex_code--) {
	FileException.prototype[file_ex_codes[file_ex_code]] = file_ex_code + 1;
}
try {
	if (Uint8Array) {
		can_apply_typed_arrays_test.apply(0, new Uint8Array(1));
	}
} catch (ex) {}
if (!realURL.createObjectURL) {
	URL = view.URL = {};
}
URL.createObjectURL = function(blob) {
	var
		  type = blob.type
		, data_URI_header
	;
	if (type === null) {
		type = "application/octet-stream";
	}
	if (blob instanceof FakeBlob) {
		data_URI_header = "data:" + type;
		if (blob.encoding === "base64") {
			return data_URI_header + ";base64," + blob.data;
		} else if (blob.encoding === "URI") {
			return data_URI_header + "," + decodeURIComponent(blob.data);
		} if (btoa) {
			return data_URI_header + ";base64," + btoa(blob.data);
		} else {
			return data_URI_header + "," + encodeURIComponent(blob.data);
		}
	} else if (real_create_object_url) {
		return real_create_object_url.call(realURL, blob);
	}
};
URL.revokeObjectURL = function(object_url) {
	if (object_url.substring(0, 5) !== "data:" && real_revoke_object_url) {
		real_revoke_object_url.call(realURL, object_url);
	}
};
FBB_proto.append = function(data/*, endings*/) {
	var bb = this.data;
	// decode data to a binary string
	if (Uint8Array && data instanceof ArrayBuffer) {
		if (can_apply_typed_arrays) {
			bb.push(String.fromCharCode.apply(String, new Uint8Array(data)));
		} else {
			var
				  str = ""
				, buf = new Uint8Array(data)
				, i = 0
				, buf_len = buf.length
			;
			for (; i < buf_len; i++) {
				str += String.fromCharCode(buf[i]);
			}
		}
	} else if (get_class(data) === "Blob" || get_class(data) === "File") {
		if (FileReaderSync) {
			var fr = new FileReaderSync;
			bb.push(fr.readAsBinaryString(data));
		} else {
			// async FileReader won't work as BlobBuilder is sync
			throw new FileException("NOT_READABLE_ERR");
		}
	} else if (data instanceof FakeBlob) {
		if (data.encoding === "base64" && atob) {
			bb.push(atob(data.data));
		} else if (data.encoding === "URI") {
			bb.push(decodeURIComponent(data.data));
		} else if (data.encoding === "raw") {
			bb.push(data.data);
		}
	} else {
		if (typeof data !== "string") {
			data += ""; // convert unsupported types to strings
		}
		// decode UTF-16 to binary string
		bb.push(unescape(encodeURIComponent(data)));
	}
};
FBB_proto.getBlob = function(type) {
	if (!arguments.length) {
		type = null;
	}
	return new FakeBlob(this.data.join(""), type, "raw");
};
FBB_proto.toString = function() {
	return "[object BlobBuilder]";
};
FB_proto.slice = function(start, end, type) {
	var args = arguments.length;
	if (args < 3) {
		type = null;
	}
	return new FakeBlob(
		  this.data.slice(start, args > 1 ? end : this.data.length)
		, type
		, this.encoding
	);
};
FB_proto.toString = function() {
	return "[object Blob]";
};
return FakeBlobBuilder;
}(self));

var saveAs = saveAs || (function(view) {
	"use strict";
	var
		  doc = view.document
		  // only get URL when necessary in case BlobBuilder.js hasn't overridden it yet
		, get_URL = function() {
			return view.URL || view.webkitURL || view;
		}
		, URL = view.URL || view.webkitURL || view
		, save_link = doc.createElementNS("http://www.w3.org/1999/xhtml", "a")
		, can_use_save_link = "download" in save_link
		, click = function(node) {
			var event = doc.createEvent("MouseEvents");
			event.initMouseEvent(
				"click", true, false, view, 0, 0, 0, 0, 0
				, false, false, false, false, 0, null
			);
			return node.dispatchEvent(event); // false if event was cancelled
		}
		, webkit_req_fs = view.webkitRequestFileSystem
		, req_fs = view.requestFileSystem || webkit_req_fs || view.mozRequestFileSystem
		, throw_outside = function (ex) {
			(view.setImmediate || view.setTimeout)(function() {
				throw ex;
			}, 0);
		}
		, force_saveable_type = "application/octet-stream"
		, fs_min_size = 0
		, deletion_queue = []
		, process_deletion_queue = function() {
			var i = deletion_queue.length;
			while (i--) {
				var file = deletion_queue[i];
				if (typeof file === "string") { // file is an object URL
					URL.revokeObjectURL(file);
				} else { // file is a File
					file.remove();
				}
			}
			deletion_queue.length = 0; // clear queue
		}
		, dispatch = function(filesaver, event_types, event) {
			event_types = [].concat(event_types);
			var i = event_types.length;
			while (i--) {
				var listener = filesaver["on" + event_types[i]];
				if (typeof listener === "function") {
					try {
						listener.call(filesaver, event || filesaver);
					} catch (ex) {
						throw_outside(ex);
					}
				}
			}
		}
		, FileSaver = function(blob, name) {
			// First try a.download, then web filesystem, then object URLs
			var
				  filesaver = this
				, type = blob.type
				, blob_changed = false
				, object_url
				, target_view
				, get_object_url = function() {
					var object_url = get_URL().createObjectURL(blob);
					deletion_queue.push(object_url);
					return object_url;
				}
				, dispatch_all = function() {
					dispatch(filesaver, "writestart progress write writeend".split(" "));
				}
				// on any filesys errors revert to saving with object URLs
				, fs_error = function() {
					// don't create more object URLs than needed
					if (blob_changed || !object_url) {
						object_url = get_object_url(blob);
					}
					target_view.location.href = object_url;
					filesaver.readyState = filesaver.DONE;
					dispatch_all();
				}
				, abortable = function(func) {
					return function() {
						if (filesaver.readyState !== filesaver.DONE) {
							return func.apply(this, arguments);
						}
					};
				}
				, create_if_not_found = {create: true, exclusive: false}
				, slice
			;
			filesaver.readyState = filesaver.INIT;
			if (!name) {
				name = "download";
			}
			if (can_use_save_link) {
				object_url = get_object_url(blob);
				save_link.href = object_url;
				save_link.download = name;
				if (click(save_link)) {
					filesaver.readyState = filesaver.DONE;
					dispatch_all();
					return;
				}
			}
			// Object and web filesystem URLs have a problem saving in Google Chrome when
			// viewed in a tab, so I force save with application/octet-stream
			// http://code.google.com/p/chromium/issues/detail?id=91158
			if (view.chrome && type && type !== force_saveable_type) {
				slice = blob.slice || blob.webkitSlice;
				blob = slice.call(blob, 0, blob.size, force_saveable_type);
				blob_changed = true;
			}
			// Since I can't be sure that the guessed media type will trigger a download
			// in WebKit, I append .download to the filename.
			// https://bugs.webkit.org/show_bug.cgi?id=65440
			if (webkit_req_fs && name !== "download") {
				name += ".download";
			}
			if (type === force_saveable_type || webkit_req_fs) {
				target_view = view;
			} else {
				target_view = view.open();
			}
			if (!req_fs) {
				fs_error();
				return;
			}
			fs_min_size += blob.size;
			req_fs(view.TEMPORARY, fs_min_size, abortable(function(fs) {
				fs.root.getDirectory("saved", create_if_not_found, abortable(function(dir) {
					var save = function() {
						dir.getFile(name, create_if_not_found, abortable(function(file) {
							file.createWriter(abortable(function(writer) {
								writer.onwriteend = function(event) {
									target_view.location.href = file.toURL();
									deletion_queue.push(file);
									filesaver.readyState = filesaver.DONE;
									dispatch(filesaver, "writeend", event);
								};
								writer.onerror = function() {
									var error = writer.error;
									if (error.code !== error.ABORT_ERR) {
										fs_error();
									}
								};
								"writestart progress write abort".split(" ").forEach(function(event) {
									writer["on" + event] = filesaver["on" + event];
								});
								writer.write(blob);
								filesaver.abort = function() {
									writer.abort();
									filesaver.readyState = filesaver.DONE;
								};
								filesaver.readyState = filesaver.WRITING;
							}), fs_error);
						}), fs_error);
					};
					dir.getFile(name, {create: false}, abortable(function(file) {
						// delete file if it already exists
						file.remove();
						save();
					}), abortable(function(ex) {
						if (ex.code === ex.NOT_FOUND_ERR) {
							save();
						} else {
							fs_error();
						}
					}));
				}), fs_error);
			}), fs_error);
		}
		, FS_proto = FileSaver.prototype
		, saveAs = function(blob, name) {
			return new FileSaver(blob, name);
		}
	;
	FS_proto.abort = function() {
		var filesaver = this;
		filesaver.readyState = filesaver.DONE;
		dispatch(filesaver, "abort");
	};
	FS_proto.readyState = FS_proto.INIT = 0;
	FS_proto.WRITING = 1;
	FS_proto.DONE = 2;
	
	FS_proto.error =
	FS_proto.onwritestart =
	FS_proto.onprogress =
	FS_proto.onwrite =
	FS_proto.onabort =
	FS_proto.onerror =
	FS_proto.onwriteend =
		null;
	
	view.addEventListener("unload", process_deletion_queue, false);
	return saveAs;
}(self));
