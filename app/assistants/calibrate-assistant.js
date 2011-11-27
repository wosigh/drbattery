function CalibrateAssistant(argFromPusher) {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
	   this.BatteryInfo=null;	
	   this.IsCalibrating="false";
	   this.LastNotifyMessage="";
	   this.IsFirstCall="true";
       this.Popup="false";
	   //Hex * 19,5 = mV
	   //0xae * 19,5 = 3393mV
	   // 3432 0xb0
	   this.VAEOrig=3393;
	   this.VAEValue=3413;
       this.BumpACR=240;
       this.PowerdRunning="true";
       this.VAEStopPowerd=3450 * 1000;
}

CalibrateAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
	$$('body')[0].addClassName('palm-dark');		
	//$('battery_icon').setAttribute('src', 'images/drbattery_empty!_120x120.png');
	/* use Mojo.View.render to render view templates and add them to the scene, if needed */
	//$('version').update(" v" + Mojo.appInfo.version);
	/* setup widgets here */
	//$('battery_icon').setAttribute('style', "background:url(images/drbattery_power_120x120.png) no-repeat center");
	
   this.controller.setupWidget(Mojo.Menu.commandMenu,
        this.attributes = {
            spacerHeight: 0,
            menuClass: 'no-fade'
         },
         this.model = {
            items: [
                { label: "command",
                  toggleCmd: "calibrate",
                  items:[
                      //{ icon:'actual_icon', command: "actual" },
                      //{ icon:'health_icon',command: "health" },
                      //{ icon:'calibrate_icon', command: "calibrate" },
                      //{ icon:'advanced_icon', command: "advanced" }
                      { label: $L("Actual"), command: "actual", expand:true },
                      { label: $L("Health"), command: "health", expand:true },
                      { label: $L("Calibr."), command: "calibrate", expand:true }
                  ]}
            	]
            }
    );
	this.appMenuModel = {
		visible: true,
		items: [
			Mojo.Menu.editItem,
			{ label: 'Start Voltage', toggleCmd: 'vae3413', disabled: true, 
				items: [ 
							{label: '3.413V', command: 'vae3413', disabled: true},
							{label: '3.432V', command: 'vae3432', disabled: true},
							{label: '3.452V', command: 'vae3452', disabled: true}
				]
			},
    		{ label: "Reset Health", command: 'cmdHealthReset', disabled: true },
    		{ label: "Help", command: 'cmdHelp' }
		]
	};
	this.controller.setupWidget(Mojo.Menu.appMenu, {omitDefaultItems: true}, this.appMenuModel);

	this.viewMenuModel = { label: $L('Calibrate Menu'), 
								items: [{
								items: [
										{label: '', icon:'menu_icon', command:'cmdHelp'},
										{label: $L('Dr. Battery'), expand:'true', command:'cmdDrBattery'}, 
										{label: '', icon:'info_icon', command:'cmdInfo'}
									]}]};		

	this.controller.setupWidget(Mojo.Menu.viewMenu, { menuClass:'no-fade',spacerHeight: 0}, this.viewMenuModel);
	
	/* add event handlers to listen to events from widgets */
	Mojo.Event.listen(this.controller.document, Mojo.Event.stageDeactivate, CalibrateAssistant.prototype.stageDeactivate.bind(this));
	Mojo.Event.listen(this.controller.document, Mojo.Event.stageActivate, CalibrateAssistant.prototype.stageActivate.bind(this));
    this.controller.stageController.setWindowProperties({blockScreenTimeout: true});
	
	this.AdjustBatteryRegister("VAE",this.VAEValue,false);	
	//this.AdjustBatteryRegister("VAE",3201,false);	
	this.ReadBattery();
	this.updater=setInterval(this.UpdateAll.bind(this),3000);
    //Mojo.Controller.getAppController().showBanner({messageText: 'new 3'}, {},'');

	
};
CalibrateAssistant.prototype.UpdateStatus = function(jsonBatteryStatus) {

	try {
		//Mojo.Log.error(Object.toJSON(jsonBatteryStatus));
		if ((this.IsCalibrating=="false") && (!jsonBatteryStatus.LEARNF)){
			if (this.BatteryInfo.getcurrent > 0) {
				this.NotifyUser("Charging");
			}
			else{
				this.NotifyUser("DisCharging");
			}
		}
		if (jsonBatteryStatus.CHGTF) {
			this.LedOn('CHGTF');
		}else{
			this.LedOff('CHGTF');
		}
		if (jsonBatteryStatus.AEF) {
			this.LedOn('AEF');
		}else{
			this.LedOff('AEF');
		}
		if (jsonBatteryStatus.SEF) {
			this.LedOn('SEF');
		}else{
			this.LedOff('SEF');
		}
		if (jsonBatteryStatus.LEARNF) {
			this.LedOn('LEARNF');
			if ((this.IsCalibrating=="false") && (this.BatteryInfo.getcurrent <= 0)) {
				this.NotifyUser("CalibrationWait");
				this.IsCalibrating="waiting";
			}else if ((this.IsCalibrating=="waiting") && (this.BatteryInfo.getcurrent > 0)){
				this.NotifyUser("CalibrationStart");
				this.IsCalibrating="true";
			}else if (this.BatteryInfo.getcurrent > 0){
				this.IsCalibrating="true";
                this.NotifyUser("Calibration");
            }
            /*else if ((this.IsCalibrating!="true") && (this.BatteryInfo.getcurrent > 0)) {
				this.IsCalibrating="true";
			}*/
		}else{
			this.LedOff('LEARNF');
            if ((this.IsCalibrating=="true") && (jsonBatteryStatus.CHGTF)) {
                this.NotifyUser("CalibrationSuccess");
                this.IsCalibrating="CalibrationSuccess";	
            }else if ((this.IsCalibrating=="true")||(this.IsCalibrating=="waiting")){
                this.NotifyUser("CalibrationFailed");
                this.IsCalibrating="CalibrationFailed";	
            }
		}
		if (jsonBatteryStatus.UVF) {
			this.ClearBatteryStatusReg("UVF");
			this.LedOn('UVF');
		}else{
			this.LedOff('UVF');
		}
		if (jsonBatteryStatus.PORF) {
			this.ClearBatteryStatusReg("PORF");
			this.LedOn('PORF');
		}else{
			this.LedOff('PORF');
		}
        if (this.BatteryInfo.FuelgaugeIC == "MAXIM_DS2784") {
            this.appMenuModel.items[1].items[0].disabled=false;
            this.appMenuModel.items[1].items[1].disabled=false;
            this.appMenuModel.items[1].items[2].disabled=false;
            this.appMenuModel.items[2].disabled=false;
        }
	} catch (err) {
		Mojo.Log.error("CalibrateAssistant.prototype.UpdateStatus", err);
		Mojo.Controller.errorDialog(err);
	}
}
CalibrateAssistant.prototype.LedOn=function(led){
	try {
		if ($(led).getAttribute('src') != "images/led_green.png") {
			$(led).setAttribute('src', 'images/led_green.png');
		}
	} catch (err) {
		Mojo.Log.error("CalibrateAssistant.prototype.LedOn", err);
		Mojo.Controller.errorDialog(err);
	}
}
CalibrateAssistant.prototype.LedOff=function(led){
	try{
		if ($(led).getAttribute('src') != "images/led_gray.png") {
			$(led).setAttribute('src', 'images/led_gray.png');
		}
	} catch (err) {
		Mojo.Log.error("CalibrateAssistant.prototype.LedOff", err);
		Mojo.Controller.errorDialog(err);
	}
}
CalibrateAssistant.prototype.NotifyUser=function(calibratingStatus){
	var strStatus="";
	//return;
	try {
		if (this.LastNotifyMessage == calibratingStatus){
			return;
		}
		//Mojo.Log.error("Notify: " + calibratingStatus + "First: " + this.IsFirstCall);
		
		switch (calibratingStatus) {
			case "Charging":
				this.HidePopUp();
				strStatus ="charging";
				if (this.BatteryInfo != null){
                    if (this.BatteryInfo.FuelgaugeIC == "MAXIM_DS2784") {
                        $("info_text").update("To start calibration please disconnect charger");
                    } else {
                        $("info_text").update("Calibration not yet supported on this device");
                    }
				} else {
                    this.LastNotifyMessage="";
                }
				//if (this.IsFirstCall=="false") {
					//Mojo.Log.error("Notify ShowBanner: " + calibratingStatus + "First: " + this.IsFirstCall);
				//	Mojo.Controller.getAppController().showBanner({messageText: 'Please disconnect charger'}, {},'');
				//}
			break;		
			case "DisCharging":
				this.HidePopUp();
				strStatus="discharging";
				if (this.BatteryInfo != null){
                    if (this.BatteryInfo.FuelgaugeIC == "MAXIM_DS2784") {
                        $("info_text").update("Waiting for battery enter calibration mode at " + (this.BatteryInfo.VAE/1000).toFixed(3) + "V");
                    } else {
                        $("info_text").update("Calibration not yet supported on this device");
                    }
				} else {
                    this.LastNotifyMessage="";
                }
				//if (this.IsFirstCall=="false") {
					//Mojo.Log.error("Notify ShowBanner: " + calibratingStatus + "First: " + this.IsFirstCall);
				//	Mojo.Controller.getAppController().showBanner({messageText: 'Waiting for battery calibration mode'}, {},'');
				//}
			break;		
			case "CalibrationWait":
                window.clearInterval(this.updater);
                this.updater=setInterval(this.UpdateAll.bind(this),5000);
				strStatus="wait for charger";
                $("info_text").className="info_text_off";
				$("info_text").update("Connect charger NOW!");
				this.ShowPopUp("Connect charger NOW!");
				//Mojo.Controller.getAppController().showBanner({messageText: "Connect charger NOW!", soundClass: 'alerts'}, {},'');
			break;		
			case "CalibrationStart":
				this.HidePopUp();
                window.clearInterval(this.updater);
                this.updater=setInterval(this.UpdateAll.bind(this),3000);
				$("info_text").className="info_text_on";
                strStatus="calibrating";
				$("info_text").update("Don't disconnect charger!");
				//if (this.IsFirstCall=="false") {
				//	Mojo.Controller.getAppController().showBanner({messageText: "Don't disconnect charger!", soundClass: 'alerts'}, {},'');
				//}
			break;		
			case "Calibration":
				this.HidePopUp();
				strStatus="calibrating";
				$("info_text").className="info_text_on";
				$("info_text").update("Don't disconnect charger!");
				//if (this.IsFirstCall=="false") {
				//	Mojo.Controller.getAppController().showBanner({messageText: "Don't disconnect charger!", soundClass: 'alerts'}, {},'');
				//}
			break;		
			case "CalibrationSuccess": 
				this.HidePopUp();
				strStatus="calibrating successfull";
				$("info_text").update("Calibration successfully finished");
				if (this.IsFirstCall=="false") {
					Mojo.Controller.getAppController().showBanner({messageText: 'Calibration successfully finished', soundClass: 'alerts'}, {},'');
				}
			break;
			case "CalibrationFailed": 
				this.HidePopUp();
				strStatus="calibrating failed";
				$("info_text").update("ERROR: Calibration interrupted. Please select 'Info' for help.");
				if (this.IsFirstCall=="false") {
					Mojo.Controller.getAppController().showBanner({messageText: 'ERROR: Calibration interrupted', soundClass: 'alerts'}, {},'');
				}
			break;
			default: 
				strStatus = 'unknown status: ' +  calibratingStatus;
		}
		this.LastNotifyMessage = calibratingStatus; 
		this.controller.get("charge_status").update(strStatus);
		if (this.IsFirstCall=="true") {
			this.IsFirstCall="false";
		}
	} catch (err) {
		Mojo.Log.error("CalibrateAssistant.prototype.NotifyUser", err);
		Mojo.Controller.errorDialog(err);
	}	
}

CalibrateAssistant.prototype.UpdateView = function(jsonBatteryInfo) {
	try{
		var percent=jsonBatteryInfo.getpercent;
		//Mojo.Log.error(Object.toJSON(jsonBatteryInfo));
		this.controller.get("battery_percentage").update((percent * 1).toFixed(0) + "%");
		this.controller.get("getvoltage").update((jsonBatteryInfo.getvoltage / 1000000).toFixed(3));
		this.controller.get("getcurrent").update((jsonBatteryInfo.getcurrent / 1000).toFixed(1));
		this.controller.get("getcoulomb").update((jsonBatteryInfo.getcoulomb *1 ).toFixed(1));
        // Celsius in Fahrenheit = (( TCelsius × 9 ) / 5 ) + 32
		this.controller.get("gettemp").update(jsonBatteryInfo.gettemp + "/" + ((jsonBatteryInfo.gettemp*9./5.)+32).toFixed(0));
		if (percent >= 90) {
			$('battery_icon').setAttribute('src', 'images/drbattery_full_120x120.png');
		}else if (percent >= 80) {
			$('battery_icon').setAttribute('src', 'images/drbattery_7_120x120.png');
		}else if (percent >= 70) {
			$('battery_icon').setAttribute('src', 'images/drbattery_6_120x120.png');
		}else if (percent >= 60) {
			$('battery_icon').setAttribute('src', 'images/drbattery_5_120x120.png');
		}else if (percent >= 50) {
			$('battery_icon').setAttribute('src', 'images/drbattery_4_120x120.png');
		}else if (percent >= 40) {
			$('battery_icon').setAttribute('src', 'images/drbattery_3_120x120.png');
		}else if (percent >= 30) {
			$('battery_icon').setAttribute('src', 'images/drbattery_2_120x120.png');
		}else if (percent >= 15) {
			$('battery_icon').setAttribute('src', 'images/drbattery_1_120x120.png');
		}else if (percent >= 5){
			$('battery_icon').setAttribute('src', 'images/drbattery_empty_120x120.png');
		}else{
			$('battery_icon').setAttribute('src', 'images/drbattery_empty!_120x120.png');
		}
				
	} catch (err) {
		Mojo.Log.error("CalibrateAssistant.prototype.UpdateView", err);
		Mojo.Controller.errorDialog(err);
	}
}
CalibrateAssistant.prototype.UpdateAll = function() {
	try{
		//Mojo.Controller.getAppController().showBanner("UpdateAtt", "","Information");
		this.ReadBattery();
		//this.ReadBatteryStatusReg();
	} catch (err) {
		Mojo.Log.error("CalibrateAssistant.prototype.UpdateAll", err);
		Mojo.Controller.errorDialog(err);
	}
}
CalibrateAssistant.prototype.ClearBatteryStatusReg = function(Register) {
	try{
		this.controller.serviceRequest('palm://de.somline.drbattery', {
			method: 'ResetBatteryStatusRegister',
			parameters: {'name':Register}, 
			onSuccess: function(response) {
				Mojo.Controller.getAppController().showBanner("Register cleared: " + Register, "","Information");
			}.bind(this),
			onFailure: function(err) {
				Mojo.Log.error(Object.toJSON(err));
				Mojo.Controller.errorDialog(err.errorText);
			}.bind(this)
		});
	} catch (err) {
		Mojo.Log.error("CalibrateAssistant.prototype.ClearBatteryStatusReg", err);
		Mojo.Controller.errorDialog(err);
	}	
}

CalibrateAssistant.prototype.AdjustBatteryRegister = function(register,value,showsuccess) {
	try{
        this.controller.serviceRequest('palm://de.somline.drbattery', {
            method: 'SetBatteryRegister',
            parameters: {'name':register, 'value':value}, 
            onSuccess: function(response) {
                //this.BatteryInfo=response;
                //this.UpdateView(this.BatteryInfo);
                //Mojo.Controller.getAppController().showBanner("VAE set to: " + value/1000 + "V", "","Information");
                if (showsuccess) {
                    this.controller.showAlertDialog({
                        onChoose: function(value) {},
                        title: $L("Register successfully set"),
                        message: $L(register + " set to: " + value),
                        choices:[
                            {label:$L('OK'), value:"ok", type:'dismiss'}
                        ]
                    });
                }
            }.bind(this),
            onFailure: function(err) {
                if (err.errorText != "Unsupported") {
                    Mojo.Log.error(Object.toJSON(err));
                    Mojo.Controller.errorDialog(err.errorText);
                }
            }.bind(this)
        });
	} catch (err) {
		Mojo.Log.error("CalibrateAssistant.prototype.AdjustBatteryRegister", err);
		Mojo.Controller.errorDialog(err);
	}
}

CalibrateAssistant.prototype.PowerdCmd = function(cmd,showsuccess) {
	try{
		this.controller.serviceRequest('palm://de.somline.drbattery', {
			method: 'PowerdCmd',
			parameters: {'command':cmd}, 
			onSuccess: function(response) {
				Mojo.Controller.getAppController().showBanner("Powerd: " + cmd, "","Information");
				if (showsuccess) {
		            this.controller.showAlertDialog({
		                onChoose: function(value) {},
		                title: $L("Powerd state successfully"),
		                message: $L(register + " set to: " + cmd),
		                choices:[
		                    {label:$L('OK'), value:"ok", type:'dismiss'}
		                ]
		            });
				}
			}.bind(this),
			onFailure: function(err) {
				Mojo.Log.error(Object.toJSON(err));
				Mojo.Controller.errorDialog(err.errorText);
			}.bind(this)
		});
	} catch (err) {
		Mojo.Log.error("CalibrateAssistant.prototype.PowerdCmd", err);
		Mojo.Controller.errorDialog(err);
	}
}

CalibrateAssistant.prototype.ReadBattery = function() {
	try{
		this.controller.serviceRequest('palm://de.somline.drbattery', {
			method: 'ReadBatteryShort',
			parameters: {}, 
			onSuccess: function(response) {
				this.BatteryInfo=response;
				this.UpdateView(this.BatteryInfo);
				this.UpdateStatus(this.BatteryInfo);
				//Mojo.Controller.getAppController().showBanner("GotInfo", "","Information");
			}.bind(this),
			onFailure: function(err) {
				Mojo.Log.error(Object.toJSON(err));
				Mojo.Controller.errorDialog(err.errorText);
			}.bind(this)
		});
	} catch (err) {
		Mojo.Log.error("CalibrateAssistant.prototype.ReadBattery", err);
		Mojo.Controller.errorDialog(err);
	}
}

CalibrateAssistant.prototype.handleCommand = function(event) {
	try{
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
				case 'details':
					this.controller.stageController.swapScene('details',"");
				break;
				case 'calibrate':
					//this.controller.stageController.swapScene('calibrate',"");
				break;
				case 'advanced':
					this.controller.stageController.swapScene('advanced',"");
				break;
				case 'cmdHelp':
					this.controller.stageController.pushScene('help',"");
				break;
				case Mojo.Menu.helpCmd:
					this.controller.stageController.pushScene('help',"");
				break;
				case 'cmdInfo':
					this.controller.stageController.pushScene('info',"calibrate");
				break;
				case 'cmdHealthReset':
					this.SetHealthTo100();
				break;
				case 'cmdDrBattery':
					this.controller.stageController.pushScene('info',"changelog");		
				break;
				case 'vae3413':
					this.AdjustBatteryRegister("VAE",3413,true);		
					$("info_text").update("Waiting for battery enter calibration mode at " + (3413/1000).toFixed(3) + "V");
                    //$("info_text").className="info_text_off";
					this.appMenuModel.items[1].toggleCmd='vae3413';
				break;
				case 'vae3432':
					this.AdjustBatteryRegister("VAE",3432,true);		
					$("info_text").update("Waiting for battery enter calibration mode at " + (3432/1000).toFixed(3) + "V");
                    //$("info_text").className="info_text_on";
					this.appMenuModel.items[1].toggleCmd='vae3432';
				break;
				case 'vae3452':
					this.AdjustBatteryRegister("VAE",3452,true);		
					$("info_text").update("Waiting for battery enter calibration mode at " + (3452/1000).toFixed(3) + "V");
					this.appMenuModel.items[1].toggleCmd='vae3452';
				break;
				default:
					//Mojo.Log.error("ActualAssistant.prototype.handleCommand: " + event.command);
				break;
			}
		}
	} catch (err) {
		Mojo.Log.error("CalibrateAssistant.prototype.handleCommand", err);
		Mojo.Controller.errorDialog(err);
	}
}
CalibrateAssistant.prototype.SetHealthTo100 = function(){
	try{
                this.controller.showAlertDialog({
                    onChoose: function(value) {if(value=='yes'){this.SetHealth(100);}},
                    title: $L("Setting health to 100%"),
                    message: $L("Do you want to reset the health (age) of the battery to 100%?"),
                    choices:[
                        {label:$L('Yes'), value:"yes", type:'affirmative'},
                        {label:$L('No'), value:"no", type:'negative'}
                    ]
                });
		} catch (err) {
			Mojo.Log.error("CalibrateAssistant.prototype.SetHealthTo100", err);
			Mojo.Controller.errorDialog(err);
		}
} 
CalibrateAssistant.prototype.SetHealth = function(percentage) {
	try{
		this.controller.serviceRequest('palm://de.somline.drbattery', {
			method: 'SetBatteryAGE',
			parameters: {'percentage':percentage}, 
			onSuccess: function(response) {
				//this.BatteryInfo=response;
				//this.UpdateView(this.BatteryInfo);
				//Mojo.Controller.getAppController().showBanner("Health set to "+percentage+"%", "","Information");
	            this.controller.showAlertDialog({
	                onChoose: function(value) {},
	                title: $L("Health successfully set"),
	                message: $L("You should calibrate your battery now to recalculate the health to it's real value."),
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
			Mojo.Log.error("CalibrateAssistant.prototype.SetHealth", err);
			Mojo.Controller.errorDialog(err);
		}
}

CalibrateAssistant.prototype.ShowPopUp = function(message){
	try{
		var appController = Mojo.Controller.getAppController();
		var pushPopup = function(stageController) {
    	stageController.pushScene('popup', message);
		};
		appController.createStageWithCallback({name: "popup", lightweight: true, height: 100}, pushPopup, 'popupalert');
        this.Popup="true";
		} catch (err) {
			Mojo.Log.error("CalibrateAssistant.prototype.ShowPopUp", err);
			Mojo.Controller.errorDialog(err);
		}
} 
CalibrateAssistant.prototype.HidePopUp = function(){
	try{
        if (this.Popup == 'true') {
            Mojo.Controller.getAppController().closeStage('popup');
            this.Popup = 'false';
        }
		} catch (err) {
			Mojo.Log.error("CalibrateAssistant.prototype.HidePopUp", err);
			Mojo.Controller.errorDialog(err);
		}
}

CalibrateAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	try{
	} catch (err) {
		Mojo.Log.error("CalibrateAssistant.prototype.activate", err);
		Mojo.Controller.errorDialog(err);
	}
	
};
CalibrateAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
	try{
	} catch (err) {
		Mojo.Log.error("CalibrateAssistant.prototype.deactivate", err);
		Mojo.Controller.errorDialog(err);
	}	
};
CalibrateAssistant.prototype.stageDeactivate = function(event) {
	try{
		//Mojo.Log.error("CalibrateAssistant.prototype.stageDeactivate");
	} catch (err) {
		Mojo.Log.error("CalibrateAssistant.prototype.stageDeactivate", err);
		Mojo.Controller.errorDialog(err);
	}	
};
CalibrateAssistant.prototype.stageActivate = function(event) {
	try{
		//Mojo.Log.error("CalibrateAssistant.prototype.stageActivate");
	} catch (err) {
		Mojo.Log.error("CalibrateAssistant.prototype.stageActivate", err);
		Mojo.Controller.errorDialog(err);
	}	
};

CalibrateAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	try{
	   window.clearInterval(this.updater);
	   this.AdjustBatteryRegister("VAE",this.VAEOrig,false);	
	   this.controller.stageController.setWindowProperties({blockScreenTimeout: false});
	   Mojo.Event.stopListening(this.controller.document, Mojo.Event.stageActivate, CalibrateAssistant.prototype.stageActivate.bind(this));
	   Mojo.Event.stopListening(this.controller.document, Mojo.Event.stageDeactivate, CalibrateAssistant.prototype.stageDeactivate.bind(this));
	} catch (err) {
		Mojo.Log.error("CalibrateAssistant.prototype.cleanup", err);
		Mojo.Controller.errorDialog(err);
	}
};
