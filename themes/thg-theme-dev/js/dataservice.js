define
([
	'jquery',
	'core/modules/persistent-storage',
	'theme/js/constants',
	'theme/js/gibberish-aes-1.0.0.min',
	'theme/js/jquery.cookie'
],
function ($, PersistentStorage, Constants, Gibberish)
{
	var module = {};
	
	var credentials_group = 'credentials';
	var access_token_key = 'access_token';
	var user_data_key = 'user_data';
	var key = 'TKlvo2PgCq';

	module.user = PersistentStorage.get (credentials_group, user_data_key);
	module.access_token = PersistentStorage.get (credentials_group, access_token_key);
	
	console.log ("Current access token = " + module.access_token);


	module.createAccessToken = function (username, password)
	{
		console.log (username + " : " + password);

		//username = 'josh';
		//password = '5w1&N^oWhjR2eAe*ozjY';

		// use the key to encrypt the username and password before sending to the server
		//username = Gibberish.enc (username, key);
		//password = Gibberish.enc (password, key);

		return btoa (username + ":" + password);
	};


	module.onLoginPageLoaded = function (onLoginSuccess, onLoginError)
	{
		if (module.access_token)
		{
			module.logIn (module.access_token, onLoginSuccess, onLoginError);
		}
		else
		{
			$("#login-form").submit (function (event)
			{
				var access_token = module.createAccessToken ($("#username").val (), $("#password").val ());
				module.logIn (access_token, onLoginSuccess, onLoginError);
				event.preventDefault ();
			});
		}
	};


	module.logIn = function (access_token, onSuccess, onError)
	{
		if (!access_token) access_token = module.access_token;
		console.log ("logging in with access token = " + access_token);
		
		// send a GET request to the /users/me endpoint with the access_token in the Authorization header
		// if the request returns user information, the user is logged in
		// if the request returns an error, they are not
		$.ajax ({
			url: Constants.LOGIN_API,
			type: 'GET',
			headers: { "Authorization": "Basic " + access_token },
			data: { 'nonce' : module.getNonce () },
			success: function (data)
			{
				console.log ("success: " , data);
				module.saveUserData (data, access_token);
				if (onSuccess) onSuccess (data);
			},
			error: function (jqXHR, exception)
			{
				console.log ("error: " + jqXHR.status);
				module.saveUserData ("", "");
				if (onError) onError (jqXHR, exception);
			}
		});
	};
	
	
	module.logOut = function ()
	{
		//module.saveUserData ("", "");
		//module.user = user;
		//module.access_token = access_token;
		PersistentStorage.clearAll();
	};
	
	
	module.loadUserData = function ()
	{
		module.user = PersistentStorage.get (credentials_group, user_data_key);
		module.access_token = PersistentStorage.get (credentials_group, access_token_key);
	};
	
	
	module.saveUserData = function (user, access_token)
	{
		module.user = user;
		module.access_token = access_token;
		PersistentStorage.set (credentials_group, user_data_key, user);
		PersistentStorage.set (credentials_group, access_token_key, access_token);
	}
	
	
	module.getNonce = function ()
	{
		var characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		var nonce = '';

		for (var i = 0; i < 32; i++)
		{
			nonce += characters[parseInt (Math.random () * characters.length, 10)];
		}

		return nonce;
	};


	return module;
});
