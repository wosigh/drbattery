function HealthAssistant(argFromPusher) {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
	   this.BatteryInfo=null;
	   this.MagicNumber=0;
	   this.MagicResult=44;
}

HealthAssistant.prototype.setup = function() {
	//this.controller.get('loadingScrim').style.display = "none";
	/* this function is for setup tasks that have to happen when the scene is first created */
	$$('body')[0].addClassName('palm-dark');		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed */
	//$('version').update(" v" + Mojo.appInfo.version);
	/* setup widgets here */
	
	this.MyController=this.controller;
	
   this.controller.setupWidget(Mojo.Menu.commandMenu,
        this.attributes = {
            spacerHeight: 0,
            menuClass: 'no-fade'
         },
         this.model = {
            items: [
                { label: "command",
                  toggleCmd: "health",
                  items:[
                      //{ icon:'actual_icon', command: "actual" },
                      //{ icon:'health_icon',command: "health" },
                      //{ icon:'calibrate_icon', command: "calibrate" },
                      //{ icon:'advanced_icon', command: "advanced" }
                      { label: $L("Actual"), command: "actual" },
                      { label: $L("Health"), command: "health", expand:true },
                      { label: $L("Calibrate"), command: "calibrate", expand:true }
                  ]}
            	]
            }
    );

	this.appMenuModel = {
		visible: true,
		items: [
			Mojo.Menu.editItem,
    		{ label: "Help", command: 'cmdHelp' }
		]
	};
	this.controller.setupWidget(Mojo.Menu.appMenu, {omitDefaultItems: true}, this.appMenuModel);

	this.viewMenuModel = { label: $L('Health Menu'), 
								items: [{
								items: [
										{label: "help", icon:'menu_icon', command:'cmdHelp'},
										{label: $L('Dr. Battery'), expand:'true', command:'cmdDrBattery'}, 
										{label: 'info', icon:'info_icon', command:'cmdInfo'}
									]}]};		

	this.controller.setupWidget(Mojo.Menu.viewMenu, { menuClass:'no-fade',spacerHeight: 0,}, this.viewMenuModel);

    /* set the widget up here */
		var attrManufacturerRating = {
				autoFocus: false,
				hintText: '',
				modelProperty:		'value', 
				multiline:			false,
				modifierState: 		Mojo.Widget.numLock,
				growWidth: 			false,
				autoResizeMax: 		30,
				preventResize: 		true,
				focusMode:			Mojo.Widget.focusSelectMode,
				changeOnKeyPress: 	false,
				maxLength: 			4,
				enterSubmits: 		true,
				charsAllow:         function (charCode) {return (this.checkNumber(charCode));}.bind(this),
				holdToEdit: 		true
												
		};

		this.modelManufacturerRating = {
			value : '',
			disabled: true
		};

		this.controller.setupWidget('full40', attrManufacturerRating, this.modelManufacturerRating);

   /* set the widget up here */
		var attrPercent = {
				autoFocus: false,
				hintText: '',
				modelProperty:		'value', 
				multiline:			false,
				modifierState: 		Mojo.Widget.numLock,
				growWidth: 			false,
				autoResizeMax: 		30,
				preventResize: 		true,
				focusMode:			Mojo.Widget.focusSelectMode,
				changeOnKeyPress: 	false,
				maxLength: 			3,
				enterSubmits: 		true,
				charsAllow:         function (charCode) {return (this.checkNumber(charCode));}.bind(this),
				holdToEdit: 		true
												
		};

		this.modelPercent = {
			value : '',
			disabled: false
		};

		this.controller.setupWidget('percent', attrPercent, this.modelPercent);

		this.AgeListener = Mojo.Event.listenForFocusChanges(this.controller.get("percent"), this.handleAgeFocus.bind(this));
		this.Full40Listener = Mojo.Event.listenForFocusChanges(this.controller.get("full40"), this.handleFull40Focus.bind(this));
		//this.Full40Listener = null;
	
	/* add event handlers to listen to events from widgets */
	this.Update();
	//$('message').update('Initially rated: Capacity you paid for. \nCalculated left: Capacity you have now.');
};

HealthAssistant.prototype.checkNumber = function(ascii){
	try{
		//Mojo.Log.error("HealthAssistant.prototype.checkNumber", ascii);	
		if ((ascii >= 48) && (ascii <= 57)){
			return (true);
		}else{
			return (false);
		}	
	} catch (err) {
		Mojo.Log.error("HealthAssistant.prototype.handleFull40Focus", err);
		Mojo.Controller.errorDialog(err);
	}
	return(false);
}
HealthAssistant.prototype.handleFull40Focus = function(element){
	try{
	//Mojo.Log.error("HealthAssistant.prototype.handleFull40Focus" + " Enter");
		if (element === null){
			//Mojo.Log.error("HealthAssistant.prototype.handleFull40Focus" + " Lost Focus");
			//Mojo.Log.error("HealthAssistant.prototype.handleFull40Focus" + " Value: " + this.modelManufacturerRating.value);
				if ((this.modelManufacturerRating.value * 1).toFixed(0) == (this.BatteryInfo.getfull40 * 1).toFixed(0)) {
					this.Update();
					this.modelPercent.disabled=false;
					this.controller.modelChanged(this.modelPercent, this);
					return;
				}
				if (this.modelManufacturerRating.value == this.BatteryInfo.getfull40) {
					this.controller.get("full40").mojo.setValue((this.BatteryInfo.getfull40 * 1).toFixed(0) + " mAh");
					return;
				}
			//Mojo.Log.error("HealthAssistant.prototype.handleFull40Focus" + "LostFocus");
			if ((this.modelManufacturerRating.value >= 500) && (this.modelManufacturerRating.value <= 5000)){		 
		        this.controller.showAlertDialog({
		            onChoose: function(value) {this.handleFull40Update(value);},
		            title: $L("Setting Manufacturer Rating"),
		            message: $L("Do you really want to set the Manufacturer Rating (full40) to " + this.modelManufacturerRating.value + 
		            	" mAh?\nThis needs a reboot of the device!\nPlease consult the support page if you're unsure."),
		            choices:[
		                {label:$L('I\'ll take the risk'), value:"yes", type:'affirmative'},
		                {label:$L('No'), value:"no", type:'negative'}
		            ]
		        });
			}else{
				this.controller.showAlertDialog({
	                onChoose: function(value) {},
	                title: $L("Invalid Value"),
	                message: $L("Manufacturer Rating needs to be between 500 and 5000."),
	                choices:[
	                    {label:$L('OK'), value:"ok", type:'dismiss'}
	                ]
	            });
				this.controller.get("full40").mojo.setValue((this.BatteryInfo.getfull40 * 1).toFixed(0) + " mAh");	
			}
			//this.AgeListener = Mojo.Event.listenForFocusChanges(this.controller.get("percent"), this.handleAgeFocus.bind(this));		
			this.modelPercent.disabled=false
			this.controller.modelChanged(this.modelPercent, this);
		}else{
			//this.AgeListener.stopListening();
			this.modelPercent.disabled=true
			this.controller.modelChanged(this.modelPercent, this);
			
			//Mojo.Log.error("HealthAssistant.prototype.handleFull40Focus" + " GotFocus");
			//Mojo.Log.error("HealthAssistant.prototype.handleFull40Focus Set Value " + this.BatteryInfo.getfull40);
			//this.controller.get("full40").mojo.setValue((this.BatteryInfo.getfull40 * 1).toFixed(0));
			this.modelManufacturerRating.value=(this.BatteryInfo.getfull40 * 1).toFixed(0);
			this.controller.modelChanged(this.modelManufacturerRating, this);
			this.controller.get("full40").mojo.setCursorPosition(0,4);
		}
	} catch (err) {
		Mojo.Log.error("HealthAssistant.prototype.handleFull40Focus", err);
		Mojo.Controller.errorDialog(err);
	}
		//Mojo.Log.error("HealthAssistant.prototype.handleFull40Focus" + " Leave");
}
HealthAssistant.prototype.handleAgeFocus = function(element){
	try{
	//Mojo.Log.error("HealthAssistant.prototype.handleAgeFocus" + " Enter");
		if (element === null){
			//Mojo.Log.error("HealthAssistant.prototype.handleAgeFocus" + " LostFocus " + this.MagicNumber);
			//Mojo.Log.error("HealthAssistant.prototype.handleAgeFocus" + "New: " + (this.modelPercent.value * 1).toFixed(0) +" Old: " +(this.BatteryInfo.getage * 1).toFixed(0));
			if ((this.modelPercent.value * 1).toFixed(0) == (this.BatteryInfo.getage * 1).toFixed(0)) {
				this.Update();
				//this.Full40Listener = Mojo.Event.listenForFocusChanges(this.controller.get("full40"), this.handleFull40Focus.bind(this));
				if (this.MagicNumber == this.MagicResult) {
					this.modelManufacturerRating.disabled=false;
					this.controller.modelChanged(this.modelManufacturerRating, this);
				}
				return;
			}
			if ((this.modelPercent.value >= 50) && (this.modelPercent.value <= 100)){		 
		        this.controller.showAlertDialog({
		            onChoose: function(value) {this.handleAgeUpdate(value);},
		            title: $L("Setting Health"),
		            message: $L("Do you want to set the Health (age) to " + this.modelPercent.value + " %?"),
		            choices:[
		                {label:$L('Yes'), value:"yes", type:'affirmative'},
		                {label:$L('No'), value:"no", type:'negative'}
		            ]
		        });
			}else{
				this.controller.showAlertDialog({
	                onChoose: function(value) {},
	                title: $L("Invalid Value"),
	                message: $L("Health needs to be between 50 and 100."),
	                choices:[
	                    {label:$L('OK'), value:"ok", type:'dismiss'}
	                ]
	            });
				this.controller.get("percent").mojo.setValue((this.BatteryInfo.getage * 1).toFixed(0) + "%");	
			}
			if (this.MagicNumber == this.MagicResult) {
				this.modelManufacturerRating.disabled=false;
				this.controller.modelChanged(this.modelManufacturerRating, this);
			}
			//this.Full40Listener = Mojo.Event.listenForFocusChanges(this.controller.get("full40"), this.handleFull40Focus.bind(this));
		}else{
			//this.Full40Listener.stopListening();
			this.modelManufacturerRating.disabled=true
			this.controller.modelChanged(this.modelManufacturerRating, this);
			//Mojo.Log.error("HealthAssistant.prototype.handleAgeFocus" + " GotFocus");
			this.controller.get("percent").mojo.setValue((this.BatteryInfo.getage * 1).toFixed(0));
			this.modelPercent.value=(this.BatteryInfo.getage * 1).toFixed(0);
			this.controller.modelChanged(this.modelPercent, this);
			this.controller.get("percent").mojo.setCursorPosition(0,3);
		}
	} catch (err) {
		Mojo.Log.error("HealthAssistant.prototype.handleAgeFocus", err);
		Mojo.Controller.errorDialog(err);
	}
		//Mojo.Log.error("HealthAssistant.prototype.handleFull40Focus" + " Leave");
}
HealthAssistant.prototype.handleFull40Update = function(value){
	//Mojo.Log.error("HealthAssistant.prototype.handleFull40Update" + "Start");
	try{
		if(value=='yes'){
			this.SetFull40(this.controller.get("full40").mojo.getValue());
			this.controller.get("full40").mojo.setValue(this.controller.get("full40").mojo.getValue() + " mAh");
		}else{
			this.controller.get("full40").mojo.setValue((this.BatteryInfo.getfull40 * 1).toFixed(0) + " mAh");
		}		
	} catch (err) {
		Mojo.Log.error("HealthAssistant.prototype.handleFull40Update", err);
		Mojo.Controller.errorDialog(err);
	}
}
HealthAssistant.prototype.handleAgeUpdate = function(value){
	//Mojo.Log.error("HealthAssistant.prototype.handleAgeUpdate" + "Start");
	try{
		if(value=='yes'){
			this.SetAge(this.controller.get("percent").mojo.getValue());
			this.Update();
			//this.controller.get("percent").mojo.setValue(this.controller.get("percent").mojo.getValue() + "%");
		}else{
			this.controller.get("percent").mojo.setValue((this.BatteryInfo.getage * 1).toFixed(0) + "%");
		}		
	} catch (err) {
		Mojo.Log.error("HealthAssistant.prototype.handleAgeUpdate", err);
		Mojo.Controller.errorDialog(err);
	}
}
HealthAssistant.prototype.SetFull40 = function(capacity) {
	try{
		this.controller.serviceRequest('palm://de.somline.drbattery', {
			method: 'SetBatteryFULL40',
			parameters: {'capacity':capacity*1}, 
			onSuccess: function(response) {
	            this.controller.showAlertDialog({
	                onChoose: function(value) {},
	                title: $L("Manufacturer Rating successfully set to " + capacity + "mAh"),
	                message: $L("You need to reboot the device and should calibrate your battery after."),
	                choices:[
	                    {label:$L('OK'), value:"ok", type:'dismiss'}
	                ]
	            });
			}.bind(this),
			onFailure: function(err) {
				//window.clearInterval(this.updater);
				Mojo.Log.error(Object.toJSON(err));
				Mojo.Controller.errorDialog(err.errorText);
			}.bind(this)
		});
		} catch (err) {
			Mojo.Log.error("HealthAssistant.prototype.SetFull40", err);
			Mojo.Controller.errorDialog(err);
		}
}
HealthAssistant.prototype.SetAge = function(percentage) {
	try{
		this.controller.serviceRequest('palm://de.somline.drbattery', {
			method: 'SetBatteryAGE',
			parameters: {'percentage':percentage*1}, 
			onSuccess: function(response) {
				//Mojo.Controller.getAppController().showBanner("Health set to "+percentage+"%", "","Information");
	            this.controller.showAlertDialog({
	                onChoose: function(value) {},
	                title: $L("Health successfully set to " + percentage +"%"),
	                message: $L("You should calibrate your battery now."),
	                choices:[
	                    {label:$L('OK'), value:"ok", type:'dismiss'}
	                ]
	            });
			}.bind(this),
			onFailure: function(err) {
				Mojo.Log.error(Object.toJSON(err));
				Mojo.Controller.errorDialog(err.errorText);
			}.bind(this)
		});
		} catch (err) {
			Mojo.Log.error("HealthAssistant.prototype.SetAge", err);
			Mojo.Controller.errorDialog(err);
		}
}

HealthAssistant.prototype.UpdateView = function(jsonBatteryInfo) {
	var age=(jsonBatteryInfo.getage*1).toFixed(0);
	//this.controller.get("battery_percentage").update(age + "%");
	this.modelPercent.value=age + "%";
	this.controller.modelChanged(this.modelPercent, this);
	var full40=jsonBatteryInfo.getfull40 * 1;
	//this.controller.get("full40").update(full40.toFixed(0) + " mAh");
	//this.controller.get('full40').value=full40.toFixed(0) + " mAh";
	this.modelManufacturerRating.value=full40.toFixed(0) + " mAh";
	this.controller.modelChanged(this.modelManufacturerRating, this);
	this.controller.get("calculated").update((full40 * age / 100).toFixed(0) + " mAh");
	if (age >= 98) {
		$('battery_icon').setAttribute('src', 'images/drbattery_full_120x120.png');
	}else if (age >= 95) {
		$('battery_icon').setAttribute('src', 'images/drbattery_7_120x120.png');
	}else if (age >= 90) {
		$('battery_icon').setAttribute('src', 'images/drbattery_6_120x120.png');
	}else if (age >= 85) {
		$('battery_icon').setAttribute('src', 'images/drbattery_5_120x120.png');
	}else if (age >= 50) {
		$('battery_icon').setAttribute('src', 'images/drbattery_4_120x120.png');
	}else if (age >= 50) {
		$('battery_icon').setAttribute('src', 'images/drbattery_3_120x120.png');
	}else {
		$('battery_icon').setAttribute('src', 'images/drbattery_2_120x120.png');
	}	
}

HealthAssistant.prototype.Update = function() {
	this.controller.serviceRequest('palm://de.somline.drbattery', {
		method: 'ReadBatteryHealth',
		parameters: {}, 
		onSuccess: function(response) {
			this.BatteryInfo=response;
			this.UpdateView(this.BatteryInfo);
		}.bind(this),
		onFailure: function(err) {
			Mojo.Log.error(Object.toJSON(err));
			Mojo.Controller.errorDialog(err.errorText);
		}.bind(this)
	});
}

HealthAssistant.prototype.handleCommand = function(event) {
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
				//this.controller.stageController.swapScene('health',"");
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
				this.MagicNumber = this.MagicNumber + 2;
				this.controller.stageController.pushScene('help',"");
			break;
			case Mojo.Menu.helpCmd:
				this.controller.stageController.pushScene('help',"");
			break;
			case 'cmdInfo':
				this.MagicNumber = this.MagicNumber * 4;
				if (this.MagicNumber == this.MagicResult) {
					this.modelManufacturerRating.disabled=false;
					this.controller.modelChanged(this.modelManufacturerRating, this);
				}
				this.controller.stageController.pushScene('info',"health");
			break;
			case 'cmdDrBattery':
				this.MagicNumber = this.MagicNumber + 3;
				this.controller.stageController.pushScene('info',"changelog");		
			break;
			default:
				//Mojo.Log.error("ActualAssistant.prototype.handleCommand: " + event.command);
			break;
		}
	}
}

HealthAssistant.prototype.activate = function(event) {
	//Mojo.Log.error("Activate:");
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
};

HealthAssistant.prototype.deactivate = function(event) {
	//Mojo.Log.error("Deactivate:");
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
};

HealthAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	Mojo.Event.stopListening(this.controller.get('full40'), Mojo.Event.propertyChange, this.handleFull40Update);  
	this.AgeListener.stopListening();
	this.Full40Listener.stopListening();
	  
	 
};
