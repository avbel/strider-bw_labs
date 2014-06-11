app.controller('BwLabsCtrl', ['$scope', function ($scope) {

  //$scope.config = $scope.panelData.bw_labs;
  $scope.$watch('configs[branch.name].bw_labs.config', function (value) {
    $scope.config = value || {};
  });

  $scope.saving = false;
  $scope.save = function () {
    $scope.saving = true;
    $scope.pluginConfig('bw_labs', $scope.config, function () {
      $scope.success('Saved app.yml template');
      $scope.saving = false;
    });
  };
}]);