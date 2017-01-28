'use strict';

cs142App.controller('LoginController', ['$scope', '$routeParams', '$resource', '$rootScope', '$location',
    function ($scope, $routeParams, $resource, $rootScope, $location) {
    /*
     * Since the route is specified as '/users/:userId' in $routeProvider config the
     * $routeParams  should have the userId property set with the path from the URL.
     */
                                        
        $scope.loginName = '';
        $scope.userName = "User Name";
        $scope.invalidLogin = false;
        $scope.newUserMsg = "Enter New User Info";
        $scope.registerToggle = true;
        $scope.loginMessage = "Please Login Here";
        //$scope.main.registerToggle = true;
        
        $scope.newUser = {
            login_name: '',
            password: '',
            first_name: '',
            last_name: '',
            location: '',
            description: '',
            occupation: ''
        };
        
        $scope.cleanRegister = function () {
            $scope.newUser = {
                login_name: '',
                password: '',
                first_name: '',
                last_name: '',
                location: '',
                description: '',
                occupation: ''
            };
            $scope.passwordCopy = '';
            $scope.registerToggle = true;
        };
        
        $scope.submit = function () {
            var loginRes = $resource("/admin/login");
            
            loginRes.save({login_name: $scope.loginName, password: $scope.password},  function (user) {
                $scope.main.loggedUser = user;
                $scope.main.loggedIn = true;
                $rootScope.$broadcast('OpenSesame');
            }, function (err) {
                $scope.invalidLogin = true;
                $scope.userName = "Please enter a valid name";
            });
        };
        
        $scope.registerNewUser = function () {
            if($scope.newUser.password !== $scope.passwordCopy) {
                $scope.newUserMsg = 'Passwords do not match';
                $scope.registerToggle = false;
                return;
            }
            $scope.newUser.first_name = $scope.newUser.first_name.charAt(0).toUpperCase() + $scope.newUser.first_name.slice(1);
            $scope.newUser.last_name = $scope.newUser.last_name.charAt(0).toUpperCase() + $scope.newUser.last_name.slice(1);
            console.log($scope.newUser);
            var newUserRes = $resource("/user");
            newUserRes.save($scope.newUser, function (user) {
                $scope.cleanRegister();
                $scope.loginMessage = "Successful registration! Please login";
            }, function (err) {
                console.log(err);
                $scope.cleanRegister();
                $scope.newUserMsg = "User already exists";
                $scope.userExists = true;
                $scope.registerToggle = false;
            });
        };
        
                                        
    }]);