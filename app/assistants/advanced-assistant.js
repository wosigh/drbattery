function AdvancedAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
}

AdvancedAssistant.prototype.setup = function() {
  this.controller.setupWidget(Mojo.Menu.commandMenu,
        this.attributes = {
            spacerHeight: 0,
            menuClass: 'mymenu'
         },
         this.model = {
            items: [
                { label: "Advanced",
                  toggleCmd: "advanced",
                  items:[
                      { icon:'actual_icon', command: "actual" },
                      { icon:'health_icon',command: "health" },
                      { icon:'calibrate_icon', command: "calibrate" },
                      { icon:'advanced_icon', command: "advanced" }
                  ]}
            	]
            }
    );

	this.appMenuModel = {
		visible: true,
		items: [
			Mojo.Menu.editItem,
    		{ label: $L('Help'), command: 'cmdHelp' }
		]
	};
	this.controller.setupWidget(Mojo.Menu.appMenu, {omitDefaultItems: true}, this.appMenuModel);
    
	this.viewMenuModel = { label: $L('Actual Menu'), 
								items: [{
								items: [
										{label: "help", icon:'menu_icon', command:'cmdHelp'},
										{label: 'Dr. Battery', expand:'true', command:'cmdDrBattery'}, 
										{label: 'info', icon:'info_icon', command:'cmdInfo'}
									]}]};		

	this.controller.setupWidget(Mojo.Menu.viewMenu, { menuClass:'no-fade',spacerHeight: 0,}, this.viewMenuModel);
};
AdvancedAssistant.prototype.handleCommand = function(event) {
	/*
	if ((event.type == Mojo.Event.commandEnable) && (event.command == Mojo.Menu.helpCmd)) {
      event.stopPropagation();
    }
	*/
    if(event.type == Mojo.Event.command) {    
		switch(event.command)
		{
			case 'actual':
				this.controller.stageController.swapScene('actual',"");
			break;
			case 'health':
				this.controller.stageController.swapScene('health',"");
			break;
			case 'advanced':
				//this.controller.stageController.swapScene('advanced',"");
			break;
			case 'calibrate':
				this.controller.stageController.swapScene('calibrate',"");
			break;
			case 'cmdHelp':
				this.controller.stageController.pushScene('help',"actual");
			break;
			case Mojo.Menu.helpCmd:
				this.controller.stageController.pushScene('help',"");
			break;
			case 'cmdInfo':
				this.controller.stageController.pushScene('info',"advanced");
			break;
			case 'cmdDrBattery':
				this.controller.stageController.pushScene('info',"changelog");		
			break;
			default:
				//Mojo.Log.error("ActualAssistant.prototype.handleCommand: " + event.command);
			break;
		}
	}
}

AdvancedAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
};

AdvancedAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
};

AdvancedAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
};
