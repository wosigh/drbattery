function ActualAssistant(argFromPusher) {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
}

ActualAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
	$$('body')[0].addClassName('palm-dark');		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed */
	/* setup widgets here */

	strNeededSrvVersion="0.1.2";
	
   this.controller.setupWidget(Mojo.Menu.commandMenu,
        this.attributes = {
            spacerHeight: 0,
            menuClass: 'no-fade'
         },
         this.model = {
            items: [
                { label: "command",
                  toggleCmd: "actual",
                  items:[
                      { label: $L("Actual"), command: "actual" },
                      { label: $L("Health"), command: "health", expand:true },
                      { label: $L("Calibrate"), command: "calibrate", expand:true }
                  ]}
            	]
            }
    );
/*
   this.controller.setupWidget(Mojo.Menu.commandMenu,
        this.attributes = {
            spacerHeight: 0,
            menuClass: 'mymenu'
         },
         this.model = {
            items: [
                { label: "Actual",
                  toggleCmd: "actual",
                  items:[
                      { icon:'actual_icon', command: "actual" },
                      { icon:'health_icon',command: "health" },
                      { icon:'calibrate_icon', command: "calibrate" },
                      { icon:'advanced_icon', command: "advanced" }
                  ]}
            	]
            }
    );
*/
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

	/* add event handlers to listen to events from widgets */	
	//this.Test50();
	//this.Init();
	this.Update();
	this.updater=setInterval(this.Update.bind(this),30000);
};
ActualAssistant.prototype.Init=function(){
	try {
		this.controller.serviceRequest('palm://de.somline.drbattery', {
			method: 'version',
			parameters: {}, 
			onSuccess: function(response) {
				if (response.version < strNeededSrvVersion) {
		            this.controller.showAlertDialog({
		                onChoose: function(value) { window.close();},
		                title: $L("Wrong Dr.Battery Service Version: " + response.version),
		                message: $L("Please update the DrBatterySrv to at least: " + strNeededSrvVersion),
		                choices:[
		                    {label:$L('OK'), value:"ok", type:'dismiss'}
		                ]
		            });

				}else{
					this.Update();
					this.updater=setInterval(this.Update.bind(this),30000);
				}
			}.bind(this),
			onFailure: function(err) {
				Mojo.Log.error(Object.toJSON(err));
				Mojo.Controller.errorDialog(err.errorText);
			}.bind(this)
		});
	} catch (err) {
		Mojo.Log.error("ActualAssistant.prototype.Init", err);
		Mojo.Controller.errorDialog(err);
	}
}


ActualAssistant.prototype.UpdateView = function(jsonBatteryInfo) {
			var age=jsonBatteryInfo.getpercent;
			this.controller.get("battery_percentage").update((age * 1).toFixed(0) + "%");
			var num=parseFloat(jsonBatteryInfo.getcoulomb);
			this.controller.get("getcoulomb").update(Math.round(num,2) + " mAh");
            var temp=jsonBatteryInfo.gettemp + "&deg;C"
            temp= temp + " / " + ((jsonBatteryInfo.gettemp*9./5.)+32).toFixed(0) + "&deg;F"
			this.controller.get("gettemp").update(temp);
			this.controller.get("getvoltage").update((jsonBatteryInfo.getvoltage / 1000000).toFixed(2) + " V");
			this.controller.get("getavgcurrent").update((jsonBatteryInfo.getavgcurrent / 1000).toFixed(2) + " mA");
			if (age >= 90) {
				$('battery_icon').setAttribute('src', 'images/drbattery_full_120x120.png');
			}else if (age >= 80) {
				$('battery_icon').setAttribute('src', 'images/drbattery_7_120x120.png');
			}else if (age >= 70) {
				$('battery_icon').setAttribute('src', 'images/drbattery_6_120x120.png');
			}else if (age >= 60) {
				$('battery_icon').setAttribute('src', 'images/drbattery_5_120x120.png');
			}else if (age >= 50) {
				$('battery_icon').setAttribute('src', 'images/drbattery_4_120x120.png');
			}else if (age >= 40) {
				$('battery_icon').setAttribute('src', 'images/drbattery_3_120x120.png');
			}else if (age >= 30) {
				$('battery_icon').setAttribute('src', 'images/drbattery_2_120x120.png');
			}else if (age >= 15) {
				$('battery_icon').setAttribute('src', 'images/drbattery_1_120x120.png');
			}else if (age >= 5){
				$('battery_icon').setAttribute('src', 'images/drbattery_empty_120x120.png');
			}else{
				$('battery_icon').setAttribute('src', 'images/drbattery_empty!_120x120.png');
			}
	//Mojo.Controller.getAppController().showBanner({messageText: 'Update Test', soundClass: 'media', soundClass: 'alerts'}, {},'');

}

ActualAssistant.prototype.Update = function() {

	this.controller.serviceRequest('palm://de.somline.drbattery', {
		method: 'ReadBatteryShort',
		parameters: {}, 
		onSuccess: function(response) {
			this.BatteryInfo=response;
			this.UpdateView(this.BatteryInfo);
			//Mojo.Controller.getAppController().showBanner("GotInfo", "","Information");
		}.bind(this),
		onFailure: function(err) {
			window.clearInterval(this.updater);
			Mojo.Log.error(Object.toJSON(err));
			Mojo.Controller.errorDialog(err.errorText);
		}.bind(this)
	});
}

ActualAssistant.prototype.handleCommand = function(event) {
	/*
	if ((event.type == Mojo.Event.commandEnable) && (event.command == Mojo.Menu.helpCmd)) {
      event.stopPropagation();
    }
	*/
    if(event.type == Mojo.Event.command) {    
		switch(event.command)
		{
			case 'actual':
				//this.controller.stageController.swapScene('actual',"");
			break;
			case 'health':
				this.controller.stageController.swapScene('health',"");
			break;
			case 'details':
				this.controller.stageController.swapScene('details',"");
			break;
			case 'calibrate':
				this.controller.stageController.swapScene('calibrate',"");
			break;
			case 'advanced':
				this.controller.stageController.swapScene('advanced',"");
			break;
			case 'cmdHelp':
				this.controller.stageController.pushScene('help',"actual");
			break;
			case Mojo.Menu.helpCmd:
				this.controller.stageController.pushScene('help',"");
			break;
			case 'cmdInfo':
				this.controller.stageController.pushScene('info',"actual");
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

ActualAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
};

ActualAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
};
ActualAssistant.prototype.stageDeactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
};
ActualAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	   window.clearInterval(this.updater);
};
