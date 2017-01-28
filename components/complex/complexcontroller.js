cs142App.controller('ComplexController', ['$scope', '$resource', '$rootScope', '$location', '$http', '$route', '$mdDialog',
    function ($scope, $resource, $rootScope, $location, $http, $route, $mdDialog) {
        
    $scope.items = [];
    $scope.usingSharingList = false;
    var userListRes = $resource('/basic/userList');
    userListRes.query(function (userList) {
        for(var i = 0; i < userList.length; i++) {
            $scope.items.push(userList[i].first_name);
            if(userList[i].current) {
                $scope.curUser = userList[i].first_name;
                $scope.selected = [$scope.curUser];
            }
        }
        
        $scope.isCurUser = function (item) {
            return item === $scope.curUser;
        };
        
         $scope.toggle = function (item, list) {
            if($scope.isCurUser(item)) {
                return;
            }
            var idx = list.indexOf(item);
            if (idx > -1) {
              list.splice(idx, 1);
            }
            else {
              list.push(item);
            }
          };
          $scope.exists = function (item, list) {
            return list.indexOf(item) > -1;
          };
          $scope.isIndeterminate = function() {
            return ($scope.selected.length !== 0 &&
                $scope.selected.length !== $scope.items.length);
          };
          $scope.isChecked = function() {
            return $scope.selected.length === $scope.items.length;
          };
          $scope.toggleAll = function() {
            if ($scope.selected.length === $scope.items.length) {
              $scope.selected = [$scope.curUser];
            } else if ($scope.selected.length === 0 || $scope.selected.length > 0) {
                $scope.selected = $scope.items.slice(0);
            }
          };
        
          $scope.useSharingList = function () {
              //$scope.toggleAll();
              console.log("At least Im called");
              if($scope.usingSharingList) {
                  $scope.selected = [$scope.curUser];
              } else {
                  $scope.selected = [];
              }
          };
        $scope.selected = [];
    });
        
    $scope.cancel = function() {
        $mdDialog.cancel();
    };

    //This include the copied code from the hints in class
    var selectedPhotoFile;   // Holds the last file selected by the user

    // Called on file selection - we simply save a reference to the file in selectedPhotoFile
    $scope.inputFileNameChanged = function (element) {
        selectedPhotoFile = element.files[0];
    };

    // Has the user selected a file?
    $scope.inputFileNameSelected = function () {
        return !!selectedPhotoFile;
    };

    // Upload the photo file selected by the user using a post request to the URL /photos/new
    $scope.uploadPhoto = function () {
        if (!$scope.inputFileNameSelected()) {
            console.error("uploadPhoto called will no selected file");
            return;
        }
        //console.log('fileSubmitted', selectedPhotoFile);

        // Create a DOM form and add the file to it under the name uploadedphoto
        var domForm = new FormData();
        domForm.append('uploadedphoto', selectedPhotoFile);
        domForm.append('selectedUsers', $scope.selected);
        //domForm.append('arrayOfUsers', $scope.selected);

        // Using $http to POST the form
        $http.post('/photos/new', domForm, {
            transformRequest: angular.identity,
            headers: {'Content-Type': undefined}
        }).success(function(newPhoto){
            // The photo was successfully uploaded. XXX - Do whatever you want on success.
            console.log(newPhoto);
            var path = $location.path();

            if(path === ('/photos/'+newPhoto.user_id)) {
                $route.reload();
            } else {
                $location.path("/photos/" + newPhoto.user_id);
            }
            $mdDialog.cancel();
            //$scope.main.loggedIn = !$scope.main.loggedIn;
            //$scope.main.loggedIn = !$scope.main.loggedIn;

            //$scope.main.advancedFeatures = !$scope.main.advancedFeatures;
        }).error(function(err){
            // Couldn't upload the photo. XXX  - Do whatever you want on failure.
            console.error('ERROR uploading photo', err);
        });
    }; 
        
        
  
    }]);