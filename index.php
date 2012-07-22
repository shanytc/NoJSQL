<!DOCTYPE html>
<html>
	<head>
		<link rel="stylesheet" href="main.css" type="text/css"/>
		<script type="text/javascript" src="jquery-1.7.2.min"></script>
		<script type="text/javascript" src="nosql.engine.js"></script>
		<script type="text/javascript" src="db.js"></script>

		<script>

			$(function() {
				nojsql.setDB(nosql_data); // set database
				sql=$('#editor').val();
				results = nojsql.getFieldsBySql(sql); // get results

				formatResults(results);

				$('#go').live('click',function(){
					sql=$('#editor').val();
					results = nojsql.getFieldsBySql(sql);
					formatResults(results);
				});

				function formatResults(results){
					$('#results').html('');
					$('#errors').html('');
					if(!results.length) return;
					
					if(results[0].length){
						$('#results').append('<table cellspacing="0" cellpadding="0" id="db_results"></table>');
						$("#db_results").append('<th class="row">#</th>');
						$.each(results[0], function(index, val) {
							$("#db_results").append('<th>'+val.toUpperCase()+'</th>');
						});
					}
					
					// show the results
					if(results[1].length){
						$.each(results[1], function(index, val) {
							$('#db_results').append('<tr></tr>');
							$('#db_results tr:last').append('<td class="row">'+(index+1)+'</td>');
							$.each(val, function(i, v) {
								$('#db_results tr:last').append('<td>'+v+'</td>');
							});
						});
					}

					// show the errors
					if(results[2].length){
						$.each(results[2], function(index, val) {
							$('#errors').append('<div>'+val+'</td>');
						});
					}
				}

				/*
				// file read and save for future INSERT/UPDATE MySQL commands (?)
				window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
				xhr=new XMLHttpRequest();
				xhr.open("GET",'db.js',true);
				xhr.onreadystatechange = function(){
					if (xhr.readyState===4 && xhr.status==200) {
						file=xhr.responseText;
						$('#dbEditor').val(file);

						var bb = new BlobBuilder;
						bb.append($('#dbEditor').val().toString());
						var blob = bb.getBlob("application/text;charset=" + document.characterSet);
						//saveAs(blob, "document.js");
					};
				}
				xhr.send(null);
				*/
			});
		</script>
	</head>
	<body>
		
		<div id="main">
			<h1>NoJSQL Engine</h1>
		</div>
		<textarea id="dbEditor"></textarea>
		<div id="sqlEditor">
			SQL Editor:
			<textarea id="editor" style="width:100%; height:120px;">SELECT id,age,address
FROM persons 
where (id like 'This is a test') and (age like "is another test you know") and (x >= 4)
ORDER BY id asc, age desc
LIMIT 0,12;
</textarea>
			<input type="button" value="GO" id="go">
		</div>
		<div id="errors"></div>
		<div id="results"></div>
	</body>

</html>