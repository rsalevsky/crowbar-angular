/*global bard $controller $httpBackend should assert upgradeFactory $q $rootScope
  upgradeStepsFactory upgradeStatusFactory UNEXPECTED_ERROR_DATA */
describe('openStack Backup Controller', function() {
    var controller,
        failingErrors = {
            auth_error: { data: 'Authentication failure', help: 'Please authenticate' },
        },
        initialStatusResponseData = {
            current_step: 'backup',
            substep: null,
            current_node: null,
            remaining_nodes: null,
            upgraded_nodes: null,
            crowbar_backup: '--some path--',
            openstack_backup: '--other path--',
            steps: {
                prechecks: {
                    status: 'passed',
                    errors: {}
                },
                prepare: {
                    status: 'passed',
                    errors: {}
                },
                backup_crowbar: {
                    status: 'passed',
                    errors: {}
                },
                repocheck_crowbar: {
                    status: 'passed',
                    errors: {}
                },
                admin: {
                    status: 'passed',
                    errors: {}
                },
                database: {
                    status: 'passed',
                    errors: {}
                },
                repocheck_nodes: {
                    status: 'passed',
                    errors: {}
                },
                services: {
                    status: 'passed',
                    errors: {}
                },
                backup_openstack: {
                    status: 'pending',
                    errors: {}
                },
                nodes: {
                    status: 'pending',
                    errors: {}
                },
            }
        },
        initialStatusResponse = {
            data: initialStatusResponseData,
        },
        failedStatusData = _.merge(
            {},
            initialStatusResponseData,
            {
                steps: {
                    backup_openstack: {
                        status: 'failed',
                        errors: failingErrors,
                    }
                }
            }
        ),
        failedStatusResponse = {
            data: failedStatusData,
        },
        failingResponse = {
            data: {
                errors: failingErrors
            }
        },
        successStatusData = _.merge(
            {},
            initialStatusResponseData,
            {
                current_step: 'nodes',
                steps: {
                    backup_openstack: {
                        status: 'passed',
                    }
                }
            }
        ),
        successStatusResponse = {
            data: successStatusData,
        },
        emptyResponse = {
            data: {}
        };

    beforeEach(function() {
        //Setup the module and dependencies to be used.
        bard.appModule('crowbarApp.upgrade');
        bard.inject('$controller', '$rootScope',
            'upgradeFactory', '$q', '$httpBackend', 'upgradeStatusFactory',
            'upgradeStepsFactory', 'UNEXPECTED_ERROR_DATA');

        spyOn(upgradeStatusFactory, 'syncStatusFlags');
        spyOn(upgradeStepsFactory, 'setCurrentStepCompleted');

        bard.mockService(upgradeFactory, {
            getStatus: $q.when(initialStatusResponse),
        });

        //Create the controller
        controller = $controller('UpgradeOpenStackBackupController');

        //Mock requests that are expected to be made
        $httpBackend.expectGET('app/features/upgrade/i18n/en.json').respond({});
        $httpBackend.flush();

    });

    // Verify no unexpected http call has been made
    bard.verifyNoOutstandingHttpRequests();

    it('should exist', function() {
        should.exist(controller);
    });

    describe('openStackBackup Model', function () {
        it('should be defined', function () {
            should.exist(controller.openStackBackup);
        });

        it('is not completed by default', function() {
            assert.isFalse(controller.openStackBackup.completed);
        });

        it('is not running by default', function() {
            assert.isFalse(controller.openStackBackup.running);
        });

        describe('createBackup function', function () {
            it('should be defined', function () {
                should.exist(controller.openStackBackup.createBackup);
            });

            describe('when backup is created successfully', function () {
                beforeEach(function () {
                    // local change in mocked service
                    spyOn(upgradeFactory, 'createOpenstackBackup').and.returnValue($q.when(emptyResponse));
                    spyOn(upgradeStatusFactory, 'waitForStepToEnd').and.callFake(
                        function (step, interval, onSuccess/*, onError*/) { onSuccess(successStatusResponse); }
                    );
                    controller.openStackBackup.createBackup();
                    $rootScope.$digest();
                });

                it('should set openStackBackup.completed status to true', function () {
                    assert.isTrue(controller.openStackBackup.completed);
                });

                it('should set running to false', function () {
                    assert.isFalse(controller.openStackBackup.running);
                });

                it('should call createOpenstackBackup service function', function () {
                    expect(upgradeFactory.createOpenstackBackup).toHaveBeenCalledTimes(1);
                });

                it('should start polling for status', function () {
                    expect(upgradeStatusFactory.waitForStepToEnd).toHaveBeenCalledTimes(1);
                });
            });

            describe('when creating backup fail', function () {
                beforeEach(function () {
                    // local change in mocked service
                    spyOn(upgradeFactory, 'createOpenstackBackup').and.returnValue($q.when(emptyResponse));
                    spyOn(upgradeStatusFactory, 'waitForStepToEnd').and.callFake(
                        function (step, interval, onSuccess, onError) { onError(failedStatusResponse); }
                    );
                    controller.openStackBackup.createBackup();
                    $rootScope.$digest();
                });

                it('should leave openStackBackup.completed status at false', function () {
                    assert.isFalse(controller.openStackBackup.completed);
                });

                it('should set running to false', function () {
                    assert.isFalse(controller.openStackBackup.running);
                });

                it('should expose the errors through vm.openStackBackup.errors object', function () {
                    expect(controller.errors).toEqual(failingResponse.data);
                });

            });

            describe('when createBackup call fails', function () {
                beforeEach(function () {
                    // local change in mocked service
                    spyOn(upgradeFactory, 'createOpenstackBackup').and.returnValue($q.reject(failingResponse));
                    spyOn(upgradeStatusFactory, 'waitForStepToEnd');

                    controller.openStackBackup.createBackup();
                    $rootScope.$digest();
                });

                it('should leave openStackBackup.completed status at false', function () {
                    assert.isFalse(controller.openStackBackup.completed);
                });

                it('should set running to false', function () {
                    assert.isFalse(controller.openStackBackup.running);
                });

                it('should not start polling for status', function () {
                    expect(upgradeStatusFactory.waitForStepToEnd).not.toHaveBeenCalled();
                });

                it('should expose the errors through vm.openStackBackup.errors object', function () {
                    expect(controller.errors).toEqual(failingResponse.data);
                });
            });

            describe('when createBackup call fails unexpectedly', function () {
                beforeEach(function () {
                    // local change in mocked service
                    spyOn(upgradeFactory, 'createOpenstackBackup').and.returnValue($q.reject(emptyResponse));
                    spyOn(upgradeStatusFactory, 'waitForStepToEnd');

                    controller.openStackBackup.createBackup();
                    $rootScope.$digest();
                });

                it('should leave openStackBackup.completed status at false', function () {
                    assert.isFalse(controller.openStackBackup.completed);
                });

                it('should set running to false', function () {
                    assert.isFalse(controller.openStackBackup.running);
                });

                it('should not start polling for status', function () {
                    expect(upgradeStatusFactory.waitForStepToEnd).not.toHaveBeenCalled();
                });

                it('should expose default errors data through vm.openStackBackup.errors object', function () {
                    expect(controller.errors).toEqual(UNEXPECTED_ERROR_DATA);
                });

            });
        });

    });

});
