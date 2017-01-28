'use strict';

cs142App.controller('UserListController', ['$scope', '$resource',
    function ($scope, $resource) {
        $scope.main.title = 'Users';
        
        var userListFetch = $resource("/user/list");
        userListFetch.query(function (userList) {
            $scope.userList = userList;
        });
        
        
        
    }]);

