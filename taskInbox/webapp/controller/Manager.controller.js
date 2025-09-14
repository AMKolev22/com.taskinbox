sap.ui.define([
    "sap/ui/core/mvc/Controller"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller) {
        "use strict";

        return Controller.extend("taskInbox.controller.Manager", {
            onInit: function () {
                this.oRouter = this.getOwnerComponent().getRouter();
                const taskModel = new sap.ui.model.json.JSONModel({
                    tasks: [],
                    filteredTasks: [],
                    pendingCount: 0,
                    vacationCount: 0,
                    equipmentCount: 0,
                    travelCount: 0
                });

                const filterModel = new sap.ui.model.json.JSONModel({
                    searchQuery: "",
                    typeFilter: "",
                    priorityFilter: ""
                });

                this.getView().setModel(taskModel, "taskModel");
                this.getView().setModel(filterModel, "filterModel");

                this.oRouter.getRoute("manager").attachMatched(this.onRouteMatched, this);

            },

            onRouteMatched: function() {
                this.loadTasks();
            },

            loadTasks: async function () {
                try {
                    const response = await fetch('http://localhost:3000/api/tasks/pending');
                    const data = await response.json();

                    const taskModel = this.getView().getModel("taskModel");
                    const tasks = data.tasks || [];

                    const counts = {
                        pendingCount: tasks.length,
                        vacationCount: tasks.filter(t => t.type === 'VACATION').length,
                        equipmentCount: tasks.filter(t => t.type === 'EQUIPMENT').length,
                        travelCount: tasks.filter(t => t.type === 'TRAVEL').length
                    };

                    taskModel.setData({
                        ...taskModel.getData(),
                        tasks: tasks,
                        filteredTasks: tasks,
                        ...counts
                    });

                    this.applyFilters();
                } 
                catch (error) {
                    console.error('Error loading tasks:', error);
                    sap.m.MessageToast.show("Error loading tasks");
                }
            },

            applyFilters: function () {
                const taskModel = this.getView().getModel("taskModel");
                const filterModel = this.getView().getModel("filterModel");

                const allTasks = taskModel.getProperty("/tasks");
                const searchQuery = filterModel.getProperty("/searchQuery").toLowerCase();
                const typeFilter = filterModel.getProperty("/typeFilter");
                const priorityFilter = filterModel.getProperty("/priorityFilter");

                let filtered = allTasks.filter(task => {
                    const matchesSearch = !searchQuery ||
                        task.title.toLowerCase().includes(searchQuery) ||
                        task.employee.name.toLowerCase().includes(searchQuery) ||
                        (task.description && task.description.toLowerCase().includes(searchQuery));

                    const matchesType = !typeFilter || task.type === typeFilter;
                    const matchesPriority = !priorityFilter || task.priority === priorityFilter;

                    return matchesSearch && matchesType && matchesPriority;
                });

                taskModel.setProperty("/filteredTasks", filtered);
            },

            onSearchLiveChange: function () {
                this.applyFilters();
            },

            onTypeFilterChange: function () {
                this.applyFilters();
            },

            onPriorityFilterChange: function () {
                this.applyFilters();
            },

            onClearFiltersPress: function () {
                const filterModel = this.getView().getModel("filterModel");
                filterModel.setData({
                    searchQuery: "",
                    typeFilter: "",
                    priorityFilter: ""
                });
                this.applyFilters();
            },

            onRefreshTasksPress: function () {
                this.loadTasks();
                sap.m.MessageToast.show("Tasks refreshed");
            },

            onViewAllTasksPress: function () {
                const filterModel = this.getView().getModel("filterModel");
                filterModel.setData({
                    searchQuery: "",
                    typeFilter: "",
                    priorityFilter: ""
                });
                this.applyFilters();
            },

            onTaskPress: function (oEvent) {
                const task = oEvent.getSource().getBindingContext("taskModel").getObject();
                this.showTaskDetails(task);
            },

            onTaskApprovePress: function (oEvent) {
                const task = oEvent.getSource().getBindingContext("taskModel").getObject();
                this.approveTask(task);
            },

            onTaskRejectPress: function (oEvent) {
                const task = oEvent.getSource().getBindingContext("taskModel").getObject();
                this.rejectTask(task);
            },

            onTaskForwardPress: function (oEvent) {
                const task = oEvent.getSource().getBindingContext("taskModel").getObject();
                this.forwardTask(task);
            },

            showTaskDetails: function (task) {
                sap.m.MessageBox.information(
                    `Employee: ${task.employee.name}\n` +
                    `Title: ${task.title}\n` +
                    `Type: ${task.type}\n` +
                    `Priority: ${task.priority}\n` +
                    `Description: ${task.description || 'N/A'}\n` +
                    `Due Date: ${task.dueDate ? this.formatDate(task.dueDate) : 'N/A'}`,
                    {
                        title: "Task Details"
                    }
                );
            },

            approveTask: async function (task) {
                sap.m.MessageBox.confirm(
                    `Are you sure you want to approve "${task.title}"?`,
                    {
                        onClose: async (action) => {
                            if (action === sap.m.MessageBox.Action.OK) {
                                try {
                                    const response = await fetch(`http://localhost:3000/api/tasks/${task.id}/approve`, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({ comment: '' })
                                    });

                                    await response.json();
                                    sap.m.MessageToast.show("Task approved successfully");
                                    this.loadTasks();
                                } 
                                catch (error) {
                                    console.error('Error approving task:', error);
                                    sap.m.MessageToast.show("Error approving task");
                                }
                            }
                        }
                    }
                );
            },

            rejectTask: async function (task) {
                sap.m.MessageBox.confirm(
                    `Are you sure you want to reject "${task.title}"?`,
                    {
                        onClose: async (action) => {
                            if (action === sap.m.MessageBox.Action.OK) {
                                try {
                                    const response = await fetch(`http://localhost:3000/api/tasks/${task.id}/reject`, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({ comment: '' })
                                    });

                                    await response.json();
                                    sap.m.MessageToast.show("Task rejected successfully");
                                    this.loadTasks();
                                } 
                                catch (error) {
                                    console.error('Error rejecting task:', error);
                                    sap.m.MessageToast.show("Error rejecting task");
                                }
                            }
                        }
                    }
                );
            },

            forwardTask: async function (task) {
                const forwardToId = prompt("Enter user ID to forward to:");
                if (forwardToId) {
                    try {
                        const response = await fetch(`http://localhost:3000/api/tasks/${task.id}/forward`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                forwardToId: forwardToId,
                                comment: 'Forwarded for review'
                            })
                        });

                        await response.json();
                        sap.m.MessageToast.show("Task forwarded successfully");
                        this.loadTasks();
                    } catch (error) {
                        console.error('Error forwarding task:', error);
                        sap.m.MessageToast.show("Error forwarding task");
                    }
                }
            },

            formatDate: function (dateString) {
                if (!dateString) return 'N/A';
                return new Date(dateString).toLocaleDateString();
            },

            formatTypeState: function (type) {
                switch (type) {
                    case 'VACATION': return 'Success';
                    case 'EQUIPMENT': return 'Warning';
                    case 'TRAVEL': return 'Information';
                    default: return 'None';
                }
            },

            formatPriorityState: function (priority) {
                switch (priority) {
                    case 'URGENT': return 'Error';
                    case 'HIGH': return 'Warning';
                    case 'MEDIUM': return 'Success';
                    case 'LOW': return 'Information';
                    default: return 'None';
                }
            }
        });
    });
