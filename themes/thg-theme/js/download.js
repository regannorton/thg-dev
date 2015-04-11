//First step check parameters mismatch and checking network connection if available call    download function
function DownloadFile(URL, Folder_Name, File_Name) {
	//Parameters mismatch check
	if (URL == null && Folder_Name == null && File_Name == null) {
		return;
	}
	else {
		//checking Internet connection availablity
		var networkState = navigator.connection.type;
		if (networkState == Connection.NONE) {
			console.log( 'NOT connected' );
			return;
		} else {
			console.log( 'connected' );
			download(URL, Folder_Name, File_Name); //If available download function call
		}
	}
}

//Second step to get Write permission and Folder Creation
function download(URL, Folder_Name, File_Name) {
	//step to request a file system 
    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, fileSystemSuccess, fileSystemFail);

	function fileSystemSuccess(fileSystem) {
		var download_link = encodeURI(URL);
		ext = download_link.substr(download_link.lastIndexOf('.') + 1); //Get extension of URL
		
		var directoryEntry = fileSystem.root; // to get root path of directory
		directoryEntry.getDirectory(Folder_Name, { create: true, exclusive: false }, onDirectorySuccess, onDirectoryFail); // creating folder in sdcard
		var rootdir = fileSystem.root;
		var fp = rootdir.toURL();//rootdir.fullPath; // Returns Fulpath of local directory
		console.log( 'fp: '+fp );
		fp = fp + "/" + Folder_Name + "/" + File_Name + "." + ext; // fullpath and name of the file which we want to give
		// download function call
		console.log( 'ok lets download' );
		filetransfer(download_link, fp);
	}
	
	function onDirectorySuccess(parent) {
		// Directory created successfuly
	}
	
	function onDirectoryFail(error) {
		//Error while creating directory
		alert("Unable to create new directory: " + error.code);
	}
	
	function fileSystemFail(evt) {
		//Unable to access file system
		alert(evt.target.error.code);
	}
}

//Third step for download a file into created folder
function filetransfer(download_link, fp) {
	var fileTransfer = new FileTransfer();
	// File download function with URL and local path
	fileTransfer.download(download_link, fp,
		function (entry) {
			console.log("download complete: " + entry.fullPath);
			openFile(entry.fullPath);
		},
		function (error) {
			//Download abort errors or download failed errors
			alert("download error source " + error.source);
			alert("download error target " + error.target);
			alert("download error code" + error.code);
		}
	);
}

//Fourth step open file
function openFile(file){
	window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, fileSystemSuccess, fileSystemFail);
	function fileSystemSuccess(fileSystem) {
		var rootdir = fileSystem.root;
		var fp = rootdir.toURL();
		cordova.plugins.fileOpener2.open(
		//file:///storage/emulated/0/
			fp+file,
			'application/pdf', 
			{ 
				error : function(e) { 
					console.log('Error status: ' + e.status + ' - Error message: ' + e.message);
				},
				success : function () {
					console.log('file opened successfully');                
				}
			}
		);
	}
	
	function fileSystemFail(evt) {
		//Unable to access file system
		alert(evt.target.error.code);
	}
}
