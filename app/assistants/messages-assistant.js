function MessagesAssistant(sceneAssistant,callbackFunc) {
	this.callbackFunc = callbackFunc;
	this.sceneAssistant = sceneAssistant;
	this.controller = sceneAssistant.controller;
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
}

MessagesAssistant.prototype.setup = function(widget) {
	//$$('body')[0].addClassName('palm-dark');	
	this.widget = widget;
	/* this function is for setup tasks that have to happen when the scene is first created */		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */	
	/* setup widgets here */	
	/* add event handlers to listen to events from widgets */
	$('palm-dialog-content').update();
	this.yes = this.yes.bindAsEventListener(this);
	this.no = this.no.bindAsEventListener(this);
	
	Mojo.Event.listen(this.controller.get('yes'),Mojo.Event.tap,this.yes);
	Mojo.Event.listen(this.controller.get('no'),Mojo.Event.tap,this.no);
	
}

MessagesAssistant.prototype.yes = function(event){
	this.callbackFunc(true);
	this.widget.mojo.close();
}
MessagesAssistant.prototype.no = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	this.callbackFunc(false);	  
	  this.widget.mojo.close();
}
MessagesAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
}


MessagesAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

MessagesAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	  Mojo.Event.stopListening(this.controller.get('yes'),Mojo.Event.tap,this.yes);
	Mojo.Event.stopListening(this.controller.get('no'),Mojo.Event.tap,this.no);
}