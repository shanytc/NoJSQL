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
			});
		</script>
	</head>
	<body>
		
		<div id="main">
			<h1>NoJSQL Engine</h1>
		</div>
		<div id="sqlEditor">
			SQL Editor:
			<textarea id="editor" style="width:100%; height:120px;">SELECT id,age,address
FROM persons 
where id >= 1 and age between 10 and 20
ORDER BY id asc, age desc
LIMIT 0,12;
</textarea>
			<input type="button" value="GO" id="go">
		</div>
		<div id="errors"></div>
		<div id="results"></div>
	</body>

</html>