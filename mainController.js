'use strict';

var cs142App = angular.module('cs142App', ['mentio', 'ngRoute', 'ngMaterial', 'ngResource', 'bootstrapLightbox', 'ui.bootstrap'])
    .config(function($mdThemingProvider) {
        $mdThemingProvider.theme('default')
            .primaryPalette('teal')
            .accentPalette('deep-orange');
    });

cs142App.config(['$routeProvider', 'LightboxProvider',
    function ($routeProvider, LightboxProvider) {
        $routeProvider.
            when('/users', {
                templateUrl: 'components/user-list/user-listTemplate.html',
                controller: 'UserListController'
            }).
            when('/users/:userId', {
                templateUrl: 'components/user-detail/user-detailTemplate.html',
                controller: 'UserDetailController'
            }).
            when('/photos/:userId', {
                templateUrl: 'components/user-photos/user-photosTemplate.html',
                controller: 'UserPhotosController'
            }).
            when('/comments/:userId', {
                templateUrl: 'components/user-comments/user-commentsTemplate.html',
                controller: 'UserCommentsController'
            }).
            when('/login-register', {
                templateUrl: 'components/login-register/login-registerTemplate.html',
                controller: 'LoginController'
            }).
            when('/favorites', {
                templateUrl: 'components/favorites/favoritesTemplate.html',
                controller: 'FavoritesController'
            }).
            otherwise({
                redirectTo: '/users'
            });
    }]);

cs142App.controller('MainController', ['$scope', '$resource', '$rootScope', '$location', '$http', '$route', '$mdDialog', '$mdMedia',
    function ($scope, $resource, $rootScope, $location, $http, $route, $mdDialog, $mdMedia) {
        $scope.main = {};
        $scope.main.title = 'Users';
        $scope.main.status = 'Login Page';
        $scope.main.advancedFeatures = false;
        $scope.main.message = 'off';
        $scope.main.loggedIn = false;
        $scope.main.goToFavorites = function () {
            $location.path("/favorites");
        };
        //$scope.main.changeInComments = 0;
        $scope.main.toggle = function (val) {
            $scope.main.message = val ? 'on' : 'off';
        };
        
        $scope.main.checkLogin = function () {
            var userStatusRes = $resource('/user/status');
            console.log("I am checking the login now");
            
            userStatusRes.save(function(status) {
                if(status.data){
                    console.log("This is more trouble than its worth");
                    console.log(status.data);
                    $scope.main.loggedIn = true;
                    return true;
                } else {
                    console.log("Jajajajaja I failed");
                    $scope.main.loggedIn = false;
                    return false;
                }
            }, function(err) {
                $scope.main.loggedIn = false;
                return false;
            });
        };
        
        //$scope.main.loggedUser;
        //$scope.main.checkUserName = "Please login";
        
        //$scope.main.loggedIn = false;
        
        $scope.main.logout = function () {
            var logoutRes = $resource("/admin/logout");
            //var body = {};
            //if($scope.main.loggedUser === undefined) { 
            //    body.logUser = 'Non-empty body';
            //}
            logoutRes.save({}, function (user) {
                console.log("succesful logout");
                $rootScope.$broadcast('CloseSesame');
                $scope.main.status = 'Login Page';
            }, function (err) {
                console.log("No one is logged in, so can't log out");
            });
        };
        
        
        $scope.$on('OpenSesame', function () {
            //console.log("WTFFFFF is going on");
            $scope.main.loggedIn = true;
            $scope.main.checkUserName = "Hi " + $scope.main.loggedUser.first_name;
            //$scope.main.checkLogin();
            $location.path("/users/" + $scope.main.loggedUser._id);
        });
        
        $scope.$on('CloseSesame', function () {
            $scope.main.loggedIn = false;
            $scope.main.loggedUser = undefined;
            $scope.main.checkUserName = "Please login";
            $location.path("/login-register");
        });
        
        $rootScope.$on("$routeChangeStart", function(event, next, current) {
                var userStatusRes = $resource('/user/status');

                userStatusRes.save(function(status) {
                    if(status.data){
                        $scope.main.loggedIn = true;
                        //return true;
                    } else {
                        $scope.main.loggedIn = false;
                        //return false;
                    }
                    
                    if(!$scope.main.loggedIn){
                        $scope.main.checkUserName = "Please Login";
                 // no logged user, redirect to /login-register unless already there
                        if (next.templateUrl !== "components/login-register/login-registerTemplate.html") {
                            $location.path("/login-register");
                        }
                    } else {
                        $scope.main.checkUserName = "Hi " +status.name;
                        $scope.main.curUser = status;
                        //$scope.main.checkUserName = "Hi " + $scope.main.loggedUser.first_name;
                    }
                }, function(err) {
                    $scope.main.loggedIn = false;
                    //return false;
                    $scope.main.checkUserName = "Please Login";
             // no logged user, redirect to /login-register unless already there
                    if (next.templateUrl !== "components/login-register/login-registerTemplate.html") {
                        $location.path("/login-register");
                    }
                });
                
               
            //}
        });
        
        
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
            console.log('fileSubmitted', selectedPhotoFile);

            // Create a DOM form and add the file to it under the name uploadedphoto
            var domForm = new FormData();
            domForm.append('uploadedphoto', selectedPhotoFile);

            // Using $http to POST the form
            $http.post('/photos/new', domForm, {
                transformRequest: angular.identity,
                headers: {'Content-Type': undefined}
            }).success(function(newPhoto){
                // The photo was successfully uploaded. XXX - Do whatever you want on success.
                var path = $location.path();
                
                if(path === ('/photos/'+newPhoto.user_id)) {
                    $route.reload();
                } else {
                    $location.path("/photos/" + newPhoto.user_id);
                }
                //$scope.main.loggedIn = !$scope.main.loggedIn;
                //$scope.main.loggedIn = !$scope.main.loggedIn;
                
                //$scope.main.advancedFeatures = !$scope.main.advancedFeatures;
            }).error(function(err){
                // Couldn't upload the photo. XXX  - Do whatever you want on failure.
                console.error('ERROR uploading photo', err);
            });

        }; 

        
          $scope.main.showAdvanced = function(ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'))  && $scope.customFullscreen;
            $mdDialog.show({
              controller: 'ComplexController',
              templateUrl: 'components/complex/complex.html',
              parent: angular.element(document.body),
              targetEvent: ev,
              clickOutsideToClose:true,
              fullscreen: useFullScreen
            })
            .then(function(answer) {
              $scope.status = 'You said the information was "' + answer + '".';
            }, function() {
              $scope.status = 'You cancelled the dialog.';
            });
            $scope.$watch(function() {
              return $mdMedia('xs') || $mdMedia('sm');
            }, function(wantsFullScreen) {
              $scope.customFullscreen = (wantsFullScreen === true);
            });
          };
        
        var testRes = $resource("/test/info");
        testRes.get(function (user) {
            $scope.version = user;
        });
    }]);

