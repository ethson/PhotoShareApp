'use strict';

cs142App.controller('UserDetailController', ['$scope', '$routeParams', '$resource', '$mdDialog',
  function ($scope, $routeParams, $resource, $mdDialog) {
    /*
     * Since the route is specified as '/users/:userId' in $routeProvider config the
     * $routeParams  should have the userId property set with the path from the URL.
     */
    var userId = $routeParams.userId;

    $resource('/user/' + userId).get(function(user) {
       $scope.userDisplayed = user;

       $scope.sameAsUserLogged = $scope.main.curUser.id === user._id;
       $scope.main.status = $scope.userDisplayed.first_name + "'s page";
       //$scope.main.curUser = $scope.userDisplayed.first_name;
       $scope.main.user = user;
       if(user.mostRecentPhoto !== null) {
           $scope.userHasPhotos = true;
       } else {
           $scope.userHasPhotos = false;
       }
    });

    var commentPhotoFetch = $resource("/comments/" + userId);
    commentPhotoFetch.get(function (comPhotos) {
        $scope.commentsAndPhotos = comPhotos;
    });

      $scope.showConfirm = function(ev) {
        // Appending dialog to document.body to cover sidenav in docs app
        var confirm = $mdDialog.confirm()
              .title('Do you really want to delete your account?')
              .textContent('Warning: this action cannot be undone')
              .ariaLabel('Deleting account')
              .targetEvent(ev)
              .ok('Never mind I want to keep my account')
              .cancel('Please delete my account (Permanent)');
        $mdDialog.show(confirm).then(function() {
          //$scope.main.checkUserName = 'You decided to get rid of your debt.';
        }, function() {
          //$scope.status = 'You decided to keep your debt.';
            //Here we write the code for deleting the account
//            $scope.deleteUser
            var deleteUserRes = $resource('/deleteUser');
            deleteUserRes.save({user: $scope.main.curUser}, function(reply) {
                console.log("This shit actually happened");
                $scope.main.logout();
            });
        });
      };


  }]);
