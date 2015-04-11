define(['jquery','core/theme-app','core/theme-tpl-tags',
	'core/modules/persistent-storage','theme/js/dataservice','theme/js/download','theme/js/bootstrap.min','theme/js/jquery.sidr.min','theme/js/swiper.jquery.min','theme/js/jail.min','theme/js/moment.min','theme/js/daterangepicker'],function($,App, TemplateTags, PersistentStorage, DataService){
	
	//
	//SET SOME DEFUALT VALUES 
	//
	userKey = '';
	default_start = moment().subtract('days', 29).unix();
	default_end = moment().unix();
	default_categories = ['china','energy','environmental','family-business','leadership','local','lubricants','test','trends'];
	font_size = 'medium';
	first_run = true;
	refresh_after_logout = false;
	user_data = {}
	user_categories = [];
	
	// HOLDS ALL POST DATA
	// SET FROM archive.html
	post_data = {};
	
	// HOLDS POST DATA FOR SINGLE-PAGE SECTIONS
	// SET WHEN retrievePosts IS CALLED
	section_data = [];
	
	// HOLDS START AND END DATE FOR FILTER
	filter_date = {
		start_date:default_start,
		end_date:default_end
	};
	
	//SET FILTER CATEGORIES TO THE DEFAULTS
	filter_categories = default_categories.slice();
	//The filter categories will eventually be stored in Local Storage
	//PersistentStorage.set( 'categories', 'chosen', default_categories );
	
	// HOLDS INDEX VALUE TO JUMP TO ON SINGLE-PAGE SECTIONS
	clicked_index = 0;
	
	//TEMP AUTHENTICATION CREDS	
	/*$.ajaxSetup({
		headers: { "Authorization": "Basic " + btoa ("testAsiaRestricted:testpass") },
		//data: { 'nonce' : 'OwnZiSh8nkpjajEeGYVHOAk7z7hE79Ga' }
	});*/
	
	App.filter( 'ajax-args', function( ajax_args, web_service_name ) {
		ajax_args.beforeSend = function (xhr) {
			xhr.setRequestHeader ("Authorization", "Basic "+ userKey);
			//I think you will retrieve credentials from your user data object here
		};
		return ajax_args;
	} );
	
	// SEND APP TO LOGIN AT LAUNCH
	// Need to set both of these to false to keep the default from loading at launch
	App.setParam ('refresh-at-app-launch', false);
	App.setParam ('go-to-default-route-after-refresh', false);
	App.addCustomRoute ('authentication-route', 'login-page', {} );
	App.filter ('launch-route', function (launch_route, stats)
	{
		return 'authentication-route';
	});
	
	// ALL MY BUTTONS
	$(".navbar-home").click(function(e){
		e.preventDefault();
		window.location = '#component-latest';
	});
	
	$("#menu").click(function(e){
		e.preventDefault();
		$('#categories').fadeToggle('fast');
	});
	
	$('#fontSizeAdjust').click(function(e){
		e.preventDefault();
		cycleFontSize();
	});
	
	$('#favorites').click(function(e){
		e.preventDefault();
		filter_date.start_date = default_start;
		filter_date.end_date = default_end;
		// SET FILTER CATEGORIES BACK TO DEFAULTS
		filter_categories = default_categories.slice();
		App.refresh();
	});
	
	$('#share').click(function(e){
		e.preventDefault();
		var message = $('.swiper-slide-active .post_content').text();
		var subject = $('.swiper-slide-active .post_title').text();
		console.log('message: '+message);
		console.log('subject: '+subject);
		var file = null;
		var url = null;
		window.plugins.socialsharing.share(message,subject);
		
	});
	
	$( '.navbar' ).on( 'click', '.navbar-brand', function( e ) {
		e.preventDefault();
		console.log('logo click!');		
	} );
	
	function cycleFontSize(){
		if(font_size=='small'){
			$('.copy').removeClass('small');
			font_size='medium';
		} else if(font_size=='medium'){
			$('.copy').removeClass('medium');
			font_size='large';
		} else {
			$('.copy').removeClass('large');
			font_size='small';
		}
		$('.copy').addClass(font_size);
	}
	
	function dateFilter(startDate,endDate){
		filter_date.start_date=startDate;
		filter_date.end_date=endDate;
		retrievePosts(post_data);
	}

	$('#reservation').daterangepicker(
		 {
		  ranges: {
			 'Today': [moment(), moment()],
			 'Yesterday': [moment().subtract('days', 1), moment().subtract('days', 1)],
			 'Last 7 Days': [moment().subtract('days', 6), moment()],
			 'Last 30 Days': [moment().subtract('days', 29), moment()],
			 'This Month': [moment().startOf('month'), moment().endOf('month')],
			 'Last Month': [moment().subtract('month', 1).startOf('month'), moment().subtract('month', 1).endOf('month')]
		  },
		  startDate: moment().subtract('days', 29),
		  endDate: moment()
		},
		function(start, end) {
			start = moment(start).unix();
			end = moment(end).unix();
			dateFilter(start,end);
		}
	);
	
	$( '#my-container' ).on( 'click', '.my-get-more', function( e ) {
		  e.preventDefault();
		  console.log('loading more');
		  $( this ).attr( 'disabled', 'disabled' ).text( 'Loading...' );
		  App.getMoreComponentItems( function() {
				//If something is needed once items are retrieved, do it here.
				$( this ).removeAttr( 'disabled' );
		  } );
	} );
	
	function printPDF(id){
		var pdfUrl = 'http://thg.hfnelson.com/pdf/thg_'+id+'.pdf';
		console.log('print: '+pdfUrl);
		  if(window.requestFileSystem){
			  DownloadFile(
				pdfUrl,
				"pdf",
				"my_pdf"
				);
		  } else {
			  var win = window.open(pdfUrl, '_blank');
			  win.focus();
		  }
	}
	
	
	$( '#my-container' ).on( 'click', '.print_post', function( e ) {
		  e.preventDefault();
		  printPDF($(this).data('post_id'));
	} );
	
	$( '#my-container' ).on( 'click', '.print_comments', function( e ) {
		  e.preventDefault();
		  printPDF($(this).data('post_id')+'_c');
	} );
	
	$( '#my-container' ).on( 'click', '.print_attachments', function( e ) {
		  e.preventDefault();
		  printPDF($(this).data('post_id')+'_a');
	} );
	
	$( '#my-container' ).on( 'click', '.print_all', function( e ) {
		  e.preventDefault();
		  printPDF($(this).data('post_id')+'_a_c');
	} );
	
	App.filter( 'web-service-params', function( web_service_params, web_service_name ){ 
		var categories = user_categories;
		var chosen = filter_categories;//PersistentStorage.get( 'categories', 'chosen' );
		console.log('chosen: '+chosen);
		web_service_params.user_cats = categories;
		web_service_params.chosen_categories = chosen; 
		//Array of chosen categories slugs
		console.log('web_service_params: ',web_service_params);
		return web_service_params;
	} );
	
	App.on('screen:showed',function(current_screen,view){
		console.log ("showing a screen");
		console.log('ral: '+refresh_after_logout);
		if(refresh_after_logout){
			App.refresh();
			refresh_after_logout = false;	
		}
		if (current_screen.item_id == 'authentication-route')
		{
			$('#buttons').hide(0);
			console.log ("showing login screen");
			DataService.onLoginPageLoaded (function ()
			{
				// success, go to next page
				var credentials_group = 'credentials';
				var access_token_key = 'access_token';
				userKey = PersistentStorage.get (credentials_group, access_token_key);
				user_data = PersistentStorage.get ('credentials', 'user_data');
				console.log('user: ',user_data.ID);
				$.ajax ({
					url: '/regan.php',
					type: 'GET',
					dataType: 'json',
					data: {id:user_data.ID},
					success: function (data)
					{
						console.log ("success: " , data);
						$.each(data,function(k,v){
							$.each(v,function(k1,v1){
								user_categories.push(v1);
							});
						});
						console.log ("success... load next page");
						window.location = '#component-latest';
					},
					error: function (jqXHR, exception)
					{
						console.log ("error: " + jqXHR.status);
					}
				});
			},
			function ()
			{
				// error, display error on login page
				console.log ("error... reload login page with error");
				alert('invalid login');
				App.refresh();
			});
		}
		
		var st = moment.unix(filter_date.start_date).format('MM/DD/YYYY');
		var en = moment.unix(filter_date.end_date).format('MM/DD/YYYY');
		$('#reservation').val(st+' - '+en);
		
		$('#app-menu a').click(function(e){
			e.stopImmediatePropagation();
			e.preventDefault();
			var target_href = $(e.target).attr('href');
			if(target_href=='#logout'){
				e.preventDefault();
				//
				//LOGOUT
				//
				DataService.logOut();
				refresh_after_logout = true;
				App.showCustomPage( 'login-page', {} );
			} else {
				//
				// CATEGORY BUTTON
				//
				var target_category = target_href.substr(11);
				if($.inArray(target_category,filter_categories)<0){
					filter_categories.push(target_category);
					$(this).addClass('checked');
				} else {
					var index = filter_categories.indexOf(target_category);
					filter_categories.splice(index, 1);
					$(this).removeClass('checked');
				}
				App.refresh();
			}
		});			
		
		if( current_screen.screen_type == 'list' ){
			if(first_run){
				$('.copy').empty();
				App.refresh();
				first_run = false;	
			}
			$('#app-menu a').each(function(){
				$(this).removeClass('checked');
				var my_category = $(this).attr('href').substr(11);
				if($.inArray(my_category,filter_categories)>=0){
					$(this).addClass('checked');
				}
			});
			$('#share').hide();
			$('#menu').show();
			$('#buttons').show();
			clicked_index = 0;
			$('.summary a').click(function(e){
				clicked_index = $(this).data('index');
			});
		} else {
			$('.navbar-filter').hide();
		}
		
		if( current_screen.screen_type == 'single' ){
			$('#menu').hide();
			$('#share').show();
			$('.swiper-button-next,.swiper-button-prev').hide();
			if(section_data.length>1){
				$('.swiper-button-next,.swiper-button-prev').show();
				var swiper = new Swiper('.swiper-container', {
					nextButton: '.swiper-button-next',
					prevButton: '.swiper-button-prev',
					spaceBetween: 30
				});
				swiper.slideTo(clicked_index, 0, false);
			}
			
			var commentform=$('#commentform'); // find the comment form
			commentform.prepend('<div id="comment-status" ></div>'); // add info panel before the form to provide feedback or errors
			var statusdiv=$('#comment-status'); // define the infopanel
		
			commentform.submit(function( event ){
				$('#submit').hide();
				//serialize and store form data in a variable
				var formdata=commentform.serialize();
				//Add a status message
				statusdiv.html('<p>Processing...</p>');
				//Extract action URL from commentform
				var formurl=commentform.attr('action');
				//Post Form with data
				$.ajax({
					type: 'post',
					url: formurl,
					data: formdata,
					error: function(XMLHttpRequest, textStatus, errorThrown)
						{
							$('#submit').show();
							console.log(XMLHttpRequest);
							console.log('textStatus '+textStatus);
							console.log('errorThrown '+errorThrown);
							statusdiv.html('<p class="ajax-error" >You might have left one of the fields blank, or be posting too quickly</p>');
						},
					success: function(data, textStatus){
						$('#submit').show();
						statusdiv.html('<p class="ajax-success" >Thanks for your comment. We appreciate your response.</p>');
						console.log('data: ',data);
						data = JSON.parse(data);
						console.log('parsed data: ',data);
						console.log('author: ',data.comment_author);
						var addComment = '<div class="comment">';
							addComment+= '<p class="comment_author">'+data.comment_author+'</p>';
							addComment+= '<p class="comment_date">'+data.comment_date+'</p>';
							addComment+= '<p class="comment_content">'+data.comment_content+'</p>';
							addComment+= '</div>';
						$('.comment_area').prepend(addComment);
						/*if(data == "success" || textStatus == "success"){
							statusdiv.html('<p class="ajax-success" >Thanks for your comment. We appreciate your response.</p>');
							
						}else{
							statusdiv.html('<p class="ajax-error" >Please wait a while before posting your next comment</p>');
							commentform.find('textarea[name=comment]').val('');
						}*/
					}
				});
				event.preventDefault();
				return false;
			});
			
		}
		
	});// END ON screen:showed
	
	App.on('error',function(error){
	   alert(error.message);
	});
	
	$(window).scroll(function() {
	   if($(window).scrollTop() + $(window).height() > $(document).height() - 100) {
		   console.log("near bottom!");
		   if( TemplateTags.displayGetMoreLink() ) {
				App.getMoreComponentItems( function() {
					//If something is needed once items are retrieved, do it here.
					$( this ).removeAttr( 'disabled' );
			  } );
			}
	   }
	});
	
	/*document.addEventListener(
	  'deviceready',
	  function() {
		window.plugins.socialsharing.iPadPopupCoordinates = function() {
		  return "100,200,300,300";
		};
	  },
	  false);*/
	  
	
	
	function retrievePosts(posts){
		$('.copy').empty();
		if(posts.length){
			var content = '';
			var counter=0;
			section_data=[];
			_.each( posts, function( post ){
				if( post.date>=filter_date.start_date ){
					if( post.date<=filter_date.end_date ){
						//console.log('post: ',post);
						var category_match = false;
						var my_categories = post.cat_data.split('#');
						$(my_categories).each(function(i,e){
							if($.inArray(e,filter_categories)>-1){
								category_match=true;
							}
						});
						if(category_match==true){
							section_data.push(post);
							if( counter==0||counter%2==0){
							content+='<div class="row summaries">';
							}
							content+='<div class="col-xs-6">';
								content+='<div class="summary" data-categories="'+post.cat_data+'">';
									content+='<a href="'+TemplateTags.getPostLink(post.id)+'" data-index="'+counter+'">';
									if( post.thumbnail.src && post.thumbnail.src.length ){
										content+='<img src="http://thg.hfnelson.com/img/blank.gif" width="2048" height="443" data-src="http://thg.hfnelson.com'+post.thumbnail.src+'" class="attachment-post-thumbnail wp-post-image lazy" alt="sample" title="" style="">';
									} else {
										content+='<img src="http://thg.hfnelson.com/img/blank.gif" width="2048" height="443" data-src="http://thg.hfnelson.com/wp-content/uploads/2015/02/sample-2048x443.jpg" class="attachment-post-thumbnail wp-post-image lazy" alt="sample" title="" style="">';
									}
									content+='</a>';
									content+='<h4>';
										content+='<a href="'+TemplateTags.getPostLink(post.id)+'" data-index="'+counter+'">';
										content+=post.title;
										content+='</a>';
									content+='</h4>';
									content+='<span class="date">'+TemplateTags.formatDate(post.date,'m/d/Y')+'</span> <span class="category_name">'+post.categories+'</span>';
									content+='<div class="clearfix"></div>';
								content+='</div><!-- /.summary -->';
							content+='</div>';
							if( counter%2!=0){
							content+='</div><!-- /.summaries -->';
							}
							counter++;
						}
						
					}
				}
			});		
		}else{
			content='<p>No post found!</p>';
		}
		$('.copy').append( content );
		/*$('img.lazy').jail({
            triggerElement:'.copy',
            event: 'scroll',
            effect: 'fadeIn',
            speed : 500
        });*/
	}
	
});