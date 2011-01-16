function HelpAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
}

HelpAssistant.prototype.setup = function()
{
    
	//this.controller.get('help-title').innerHTML = $L("Help");
	this.controller.get('help-support').innerHTML = $L("Support");
	
	this.controller.setupWidget(Mojo.Menu.appMenu, {omitDefaultItems: true}, {visible: false});
	
	this.controller.get('appname').innerHTML = Mojo.appInfo.title;
	this.controller.get('appdetails').innerHTML = Mojo.appInfo.version + $L(" by somline") +
		"<br>Portion adopted from WebOS Internals";	
	
	this.supportModel = 
	{
		items: []
	};
	
	this.supportModel.items.push({
		text: $L("Forum Support"),
		detail: 'http://m.forums.precentral.net/homebrew-apps/260947-dr-battery.html',
		Class: 'img_web',
		type: 'web'
	});
	/*
	this.supportModel.items.push({
		text: $L("Background Thread"),
		detail: 'http://m.forums.precentral.net/palm-pre/256967-find-out-how-good-bad-your-battery.html',
		Class: 'img_web',
		type: 'web'
	});
	*/
	this.supportModel.items.push({
		text: $L("Fuel Gauge IC (PDF)"),
		detail: 'http://datasheets.maxim-ic.com/en/ds/DS2784.pdf',
		Class: 'img_web',
		type: 'web'
	});
	this.supportModel.items.push({
		text: $L("Support Email"),
		address: 'drbattery@somline.de',
		Class: 'img_email',
		type: 'email'
	});
	this.controller.setupWidget
	(
		'supportList', 
		{
			itemTemplate: "help/rowTemplate",
			swipeToDelete: false,
			reorderable: false
		},
		this.supportModel
	);
	
	this.controller.listen('supportList', Mojo.Event.listTap, this.listTapHandler.bindAsEventListener(this));
	
};
HelpAssistant.prototype.listTapHandler = function(event)
{
	switch (event.item.type)
	{
		case 'web':
			this.controller.serviceRequest("palm://com.palm.applicationManager", 
			{
				method: "open",
				parameters: 
				{
					id: 'com.palm.app.browser',
					params: 
					{
						target: event.item.detail
					}
				}
			});
			break;
			
		case 'email':
			this.controller.serviceRequest('palm://com.palm.applicationManager', 
			{
				method: 'open',
				parameters: 
				{
					target: 'mailto:' + event.item.address + "?subject=" + Mojo.appInfo.title + " " + event.item.subject
				}
			});
			break;
			
		case 'scene':
			this.controller.stageController.pushScene(event.item.detail);
			break;
	}
};

HelpAssistant.prototype.activate = function(event) {};
HelpAssistant.prototype.deactivate = function(event) {};
HelpAssistant.prototype.cleanup = function(event)
{
	this.controller.stopListening('supportList', Mojo.Event.listTap, this.listTapHandler.bindAsEventListener(this));
};
