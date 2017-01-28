'use strict';

cs142App.controller('UserCommentsController', ['$scope', '$routeParams', '$resource',
    function ($scope, $routeParams, $resource) {
    /*
     * Since the route is specified as '/users/:userId' in $routeProvider config the
     * $routeParams  should have the userId property set with the path from the URL.
     */
        var userId = $routeParams.userId, commentPhotoFetch, extraInfoFetch;

        commentPhotoFetch = $resource("/comments/" + userId);
        commentPhotoFetch.get(function (comPhotos) {
            $scope.commentsAndPhotos = comPhotos;
            console.log(comPhotos);
            extraInfoFetch = $resource("/user/" + userId);
            extraInfoFetch.get(function (user) {
                $scope.main.status = user.first_name + "'s comments";
            });
        });
    }]);