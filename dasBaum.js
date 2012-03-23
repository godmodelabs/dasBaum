/*
 * a simple treeview widget 
 * supports drag&drop reordering and inline renaming
 *
 * @author Martin Kleinhans <kleinhans@boerse-go.de>
 */
(function( $ ) {
	
$.widget( "ui.dasBaum", {
	options: {
		// css classes
		classes: {
			content: 		'tv_content',
			highlighted: 	'tv_highlighted',
			folder: 		'tv_folder',
			folderOpen: 	'tv_folderOpen',
			folderClosed: 	'tv_folderClosed',
			icon: 			'tv_icon',
			entry: 			'tv_entry',
			folderToggler: 	'tv_folderToggler',
			dropHover: 		'tv_dropHover',
			dropBehind: 	'tv_dropBehind',
			dropHoverRoot: 	'tv_dropHoverRoot',
			dropHelper: 	'tv_dropHelper',
			button: 		'tv_button',
			hover: 			'tv_hover',
			root: 			'tv'
		},
		// other options
		icons: 			true, 
		sort: 			false,
		indent: 		16,
		allowDrag: 		true,
		allowRename: 	true,
		allowDeselect:  true,
		foldersOnTop: 	true,
		toggleOnClick:  false,
		// initial items
		items: [],
		// callbacks
		selected: 	null,
		renamed: 	null,
		moved: 		null,
		toggled: 	null,
		details: 	null
	},
	
	targetBehindId: null,
	targetId: null,
	targetMode: null,
	autoId: 0,
	highlightedNode: null,
	inlineEditing: {
		timestamp: 0,
		id: '',
		active: false
	},
	sort: function(a,b) {
		if(!a.childs && b.childs) {
			return 1;
		} else if(a.childs && !b.childs) {
			return -1;
		}
		if(a.label == b.label) {
			return 0;
		}
		return b.label < a.label ? 1 : -1;
	},
	textSort: function(a,b) {
		if(a.label == b.label) {
			return 0;
		}
		return b.label < a.label ? 1 : -1;
	},
	typeSort: function(a,b) {
		if(!a.childs && b.childs) {
			return 1;
		} else if(a.childs && !b.childs) {
			return -1;
		}
		return 0;
	},
	//-------------------------------------------------------
	
	_create: function() {
		
	},
	
	_init: function() {
		var self = this;
		this.element.addClass(this.options.classes.root);
		this.element.click(function(){
			if(self.options.allowDeselect) {
				self._selectItem();
			}
			var ie = self.inlineEditing;
			if(ie.active) {
				self._renameItem(ie.id);
				ie.id = '';
				ie.active = false;
			}
		});
		
		this.tree = {id:'',childs:[],level:0,collapsed:false,parent:null,label:"root",element:this.element};
		
		this.setItems(this.options.items);
	},
	
	destroy:function() {
		
	},
	
	//-------------------------------------------------------
	
	_map: function(f,node,visibleOnly) {
		if(!node) {
			node = this._findItem(node);
		}
		
		f(node);
		
		if(node.childs && (!visibleOnly || !node.collapsed)) {
			for(var i = 0;i < node.childs.length;i++) {
				if(this._map(f,node.childs[i],visibleOnly) === false) {
					return;
				}
			}
		}
	},
	
	_findItemWithIndex: function(index) {
		var node = null;
		
		this._map(function(n) {
			if(n.index == index) {
				node = n;
				return false;
			}
		});
		
		return node;
	},
	
	_findItem: function(id,node) {
		if(!id) {
			return this.tree;
		}
		if(!node) {
			node = this.tree;
		}
		if(node.childs) {
			var e;
			for(var i=0;i<node.childs.length;i++) {
				if(node.childs[i].id == id) {
					return node.childs[i];
				}
				if(node.childs[i].childs && (e=this._findItem(id,node.childs[i]))) {
					return e;
				}
			}
		}
		return null;
	},
	
	_addItem: function(parentId,item) {
		var parent = this._findItem(parentId);
		if(!parent) {
			throw "[ui.dasBaum:_addItem] unknown node id '"+parentId+"'";
		}
		if(!parent.childs) {
			throw "[ui.dasBaum:_addItem] parent is not a folder!";
		}
		
		if(item.id && this._findItem(item.id)) {
			throw "[ui.dasBaum:_addItem] item with id '"+item.id+"' alreay exists!";
		}
		
		// create node
		var node = {id: item.id?item.id:'item'+(this.autoId++),
					childs:item.items?[]:null,
					level:parent.level+1,
					collapsed:item.hasOwnProperty('collapsed')?item.collapsed:true,
					parent:parent,
					label:item.label,
					cls:item.cls||null,
					element:null,
					context:item.context||null,
					buttons:item.buttons||[]
					};
		
		if(item.hasOwnProperty('itemCount')) {
			node.itemCount = item.itemCount;
		}
					
		if(item.hasOwnProperty('allowRename')) {
			node.allowRename = item.allowRename;
		}
		
		parent.childs.push(node);
		if(this.options.sort) {
			parent.childs.sort((this.options.foldersOnTop?this.sort:this.textSort));
		} else if(this.options.foldersOnTop) {
			parent.childs.sort(this.typeSort);
		}
		
		// create items
		if(item.items) {
			for(var i=0;i<item.items.length;i++) {
				this._addItem(node.id,item.items[i]);
			}
		}
	},
	
	__rebuildTree: function() {
		this._index = 0;
			
		this.element.html('');
			
		for(var i=0;i<this.tree.childs.length;i++) {
			this._rebuildTree(this.tree.childs[i]);
		}
			
		if(this.hoverFirst) {
			this.hoverFirst = false;
			this.hoveredNode = null;
			if(this._index == 1) {
				this.handleKey({keyCode:40});
			} else if(this.hoveredNode) {
				this.element.find('[data-treeviewid='+this.hoveredNode.id+']').mouseleave();
				this.hoveredNode = null;
			}
		} else if(this.hoveredNode) {
			var e = this.element.find('[data-treeviewid='+this.hoveredNode.id+']');
			if(e.length == 0) {
				this.hoveredNode = null;
			} else {
				e.mouseenter();
			}
		}
			
		if(this.options.allowDrag) {
			this.element.append('<div class="'+this.options.classes.dropHelper+'">&nbsp;</div>');
			var self = this;
			var dh = this.element.find('.'+this.options.classes.dropHelper);
			dh.droppable({
				accept: function(draggable) {
					return self._dropAccept(draggable.attr('data-treeviewid'),'');
				},
				over: function( event, ui ) {
					self._dropOver(true,ui.draggable.attr('data-treeviewid'),'');
				},
				out: function( event, ui ) {
					self._dropOut(true,ui.draggable.attr('data-treeviewid'),'');
				},
				drop: function( event, ui ) {
					self._dropInto(ui.draggable.attr('data-treeviewid'),'');
				}
			});
			dh.click(function(){
				if(self.options.allowDeselect) {
					self._selectItem();
				}
				var ie = self.inlineEditing;
				if(ie.active) {
					self._renameItem(ie.id);
					ie.id = '';
					ie.active = false;
				}
			});
			var h = this.element.height();
			this.element.children().each(function(i,e) {h-=$(e).height()});
			if(h>30) {
				dh.height(h);
			} else {
				dh.height(30);
			}
		}
	},
	
	_rebuildTree: function(node) {

		if(!node) {
			// use timeout to avoid multiple rebuilds in one tick
			if(this.__rebuildTimeout) {
				clearTimeout(this.__rebuildTimeout);
			}
			
			var self = this;
			this.__rebuildTimeout = setTimeout(function() {
				self.__rebuildTree();
			},0);
			
			return;
		} 
		
		var self = this;
		var el = null, html = null, classes;
		
		node.index = this._index++;
		
		// create dom element
		if(node.childs) {
			var itemCount = node.hasOwnProperty('itemCount')?node.itemCount:Math.min(9,node.childs.length);
			
			html = 	'<div class="'+(node.collapsed?this.options.classes.folderClosed:this.options.classes.folderOpen)+' '+this.options.classes.folder+' '+this.options.classes.folder+'_'+itemCount+'"><div class="'+this.options.classes.content+'">';
			for(var i in node.buttons) {
				classes = this.options.classes.button + ' ' + this.options.classes.button + '_' + node.buttons[i];
				html += '<div data-button="'+node.buttons[i]+'" style="display:none" class="'+classes +'">&gt;</div>';
			}
			html += '<div class="'+this.options.classes.folderToggler+'">&nbsp;</div>';
			if(this.options.icons) {
				html += '<div class="'+this.options.classes.icon+'">&nbsp;</div>';
			}
			html += '<span>'+node.label+'</span>';
			html += '</div></div>';
			
			el = $(html);
		} else {
			html = 	'<div class="'+this.options.classes.entry+'"><div class="'+this.options.classes.content+'">';
			for(var i in node.buttons) {
				classes = this.options.classes.button + ' ' + this.options.classes.button + '_' + node.buttons[i];
				html += '<div data-button="'+node.buttons[i]+'" style="display:none" class="'+classes +'">&gt;</div>';
			}
			if(this.options.icons) {
				html += '<div class="'+this.options.classes.icon+'">&nbsp;</div>';
			}
			
			if(node.html) {
				html += node.html;
			} else {
				html += '<span>'+node.label+'</span>';
			}
			
			html += '</div></div>';
			el = $(html);
		}
		node.element = el;
		
		el.hover(function() {
			if(self._dragging) {
				return;
			}
			
			// reset previously hovered element
			$(this).parent().find('.'+self.options.classes.hover).
				removeClass(self.options.classes.hover).
				find('.'+self.options.classes.button).hide();
			
			// set hover state	
			$(this).find('.'+self.options.classes.button).show();
			$(this).addClass(self.options.classes.hover);
			
			// trigger event
			if(typeof self.options.hovered == 'function') {
				self.options.hovered(node.id,node.context);
			}
			self.hoveredNode = node;
			
		}, function() {
			if(self.hoveredNode == node) {
				self.hoveredNode = null;
			}
			// reset hover state
			$(this).find('.'+self.options.classes.button).hide();
			$(this).removeClass(self.options.classes.hover);
		});
		
		el.find('.'+self.options.classes.button).click(function(event) {
			if(typeof self.options.button == 'function') {
				self.options.button(this,$(this).attr('data-button'),node.id,node.context,event);
			}
			return false;
		});
		
		el.attr('data-treeviewid',node.id);
		
		if(node.parent.level >= 1) {
			el.css('padding-left',node.parent.level*this.options.indent);
		}
		if(node.cls) {
			el.addClass(node.cls);
		}
		if(this.highlightedNode == node) {
			el.addClass(this.options.classes.highlighted);
		}
		
		if(this.options.allowDrag) {
			el.draggable({
				distance: 20,
				revert:'invalid',
				start: function() {
					self._dragging = true;
					if($(this).find('input').length > 0) {
						self._renameItem($(this).attr('data-treeviewid'));
					}
				},
				stop: function() {
					self._dragging = false;
				},
				helper: function() {
					var h = $(this).clone();
					h.removeClass(self.options.classes.highlighted);
					h.removeClass(self.options.classes.hover);
					h.find('.'+self.options.classes.folderToggler+',.'+self.options.classes.button).detach();
					return h;
				},
				opacity:0.7
			});
			
			el.find('.'+self.options.classes.content).droppable({
				greedy:'true',
				tolerance:'pointer',
				accept: function(draggable) {
					return self._dropAccept(draggable.attr('data-treeviewid'),$(this).parent().attr('data-treeviewid'));
				},
				over: function( event, ui ) {
					if(event.pageX < $(this).find('span').offset().left) {
						return;
					}
					
					var nodeId 		= ui.draggable.attr('data-treeviewid');
					var targetId 	= $(this).parent().attr('data-treeviewid');
					var dropInto	= self._findItem(targetId).childs?true:false;
					self._dropOver(dropInto,nodeId,targetId);
				},
				out: function( event, ui ) {
					var nodeId 		= ui.draggable.attr('data-treeviewid');
					var targetId 	= $(this).parent().attr('data-treeviewid');
					var dropInto	= self._findItem(targetId).childs?true:false;
					self._dropOut(dropInto,nodeId,targetId);
				},
				drop: function( event, ui ) {
					if(event.pageX < $(this).find('span').offset().left) {
						return;
					}
					
					var nodeId 		= ui.draggable.attr('data-treeviewid');
					var targetId 	= $(this).parent().attr('data-treeviewid');
					var dropInto	= self._findItem(targetId).childs?true:false;
					if(dropInto) {
						self._dropInto(nodeId,targetId);
					} else {
						self._dropBehind(nodeId,targetId);
					}
				}
			});
			el.find('.'+this.options.classes.icon).droppable({
				greedy:'true',
				tolerance:'pointer',
				accept: function(draggable) {
					return self._dropAccept(draggable.attr('data-treeviewid'),$(this).parent().parent().attr('data-treeviewid'));
				},
				over: function( event, ui ) {
					var nodeId 		= ui.draggable.attr('data-treeviewid');
					var targetId 	= $(this).parent().parent().attr('data-treeviewid');
					self._dropOver(false,nodeId,targetId);
				},
				out: function( event, ui ) {
					var nodeId 		= ui.draggable.attr('data-treeviewid');
					var targetId 	= $(this).parent().parent().attr('data-treeviewid');
					self._dropOut(false,nodeId,targetId);
				},
				drop: function( event, ui ) {
					var nodeId 		= ui.draggable.attr('data-treeviewid');
					var targetId 	= $(this).parent().parent().attr('data-treeviewid');
					self._dropBehind(nodeId,targetId);
				}
			});
		} else {
			// disable text selection on all elements except the input field used for renaming
			el.mousedown(function(e) {
				if(e.target.tagName != 'INPUT') {
					return false;
				}
			});
		}
		
		// add to dom
		this.element.append(el);
		
		// click handler
		el.find('div.'+this.options.classes.folderToggler).click(function() {
			self._toggleItem(el.attr('data-treeviewid'));
			return false;
		});
		el.click(function() {
			var id = el.attr('data-treeviewid');
			if(self.options.allowRename) {
				var ie = self.inlineEditing;
				if(id == ie.id) {
					if(!ie.active && (+new Date()) - ie.timestamp < 500) {
						ie.active = true;
						self._renameItem(id);
						//clearTimeout(ie.timeout);
						//return false;
					} else if(ie.active) {
						ie.active = false;
						self._renameItem(id);
					}
				} else {
					if(ie.active) {
						self._renameItem(ie.id);
					}
					ie.active = false;
				}
				ie.id = id;
				ie.timestamp = (+new Date());
				//ie.timeout = setTimeout(function() {
			//		self._selectItem(id);
		//		},500);
			}// else {
			
			if(el.hasClass(self.options.classes.folder) && self.options.toggleOnClick) {
				self._toggleItem(id);
			} else {
				self._selectItem(id);
			}
			//}
			return false;
		});
		
		if(node.childs && !node.collapsed) {
			for(var i=0;i<node.childs.length;i++) {
				this._rebuildTree(node.childs[i]);
			}
		}
	},
	
	_dropMode: function(x,e) {
		var sX = 0;
		e.find('.'+this.options.classes.folderToggler+',.'+this.options.classes.icon).each(function(i,c) {
			sX+=$(c).width();
		});
		return x < sX;
	},
	
	_dropAccept: function(nodeId,targetId) {
		if(!nodeId) {
			return false;
		}
		
		var node 	= this._findItem(nodeId);
		var target 	= this._findItem(targetId);
		
		if(!node || !target) {
			return false;
		}
		
		// check that target is not a child of node
		var p = target;
		while(p=p.parent) {
			if(p==node) {
				return;
			}
		}
		
		return true;
	},
	
	_dropOver: function(mode,nodeId,targetId) {
		var node 	= this._findItem(nodeId);
		var target 	= this._findItem(targetId);
		
		if(!node || !target) {
			return;
		}
		
		this._dropOut(this.targetMode,nodeId,this.targetId);
		
		var targetFolder = mode?target:target.parent;
		
		// highlight drop after
		var l = 0,t = 0;
		var targetBehind = target;
	
		if(!this.options.sort) {
			
			if(this.options.foldersOnTop && (!node.childs != !target.childs)) {
				targetBehind = targetFolder;
				for(var i=0;i<targetFolder.childs.length;i++) {
					if(!targetFolder.childs[i].childs) {
						break;
					}
					targetBehind = targetFolder.childs[i];
				}
		
				if(targetBehind==targetFolder) {
					l+= targetBehind.element.find('.'+this.options.classes.icon).width();
				}
			} else if(mode) {
				targetBehind = null;
			}
	
			// target might not be visible
			if(!targetBehind || !targetBehind.element || !targetBehind.element.is(':visible')) {
				targetBehind = target;
				l+= targetBehind.element.find('.'+this.options.classes.icon).width();
			}

			if(((mode && targetFolder==this.tree) || (!mode && targetBehind!=targetFolder)) && !targetBehind.collapsed) {
				this._map(function(e) {
					if(e==targetBehind) return;
					t+=e.element.height();
				},targetBehind,true);
			}
	
			var e;
			if(targetBehind != this.tree) {
				e = targetBehind.element.find('.'+this.options.classes.content);
				l += targetBehind.childs?e.find('.'+this.options.classes.folderToggler).width():0;
				w = e.innerWidth()-l-parseInt(e.css('padding-left'),10);
				e.append('<div style="position:relative;top:'+t+'px;left:'+l+'px;width:'+w+'px;" class="'+this.options.classes.dropBehind+'">&nbsp;</div>');
			} else {
				e = this.tree.element;
				w = this.tree.element.width();
				t = 0;
				l = 0;
				e.prepend('<div style="position:relative;top:'+t+'px;left:'+l+'px;width:'+w+'px;" class="'+this.options.classes.dropBehind+'">&nbsp;</div>');
			}
		}
		
		// highlight target folder
		if(targetFolder==this.tree) {
			targetFolder.element.addClass(this.options.classes.dropHoverRoot);
		} else {
			targetFolder.element.addClass(this.options.classes.dropHover);
		}
		
		this.targetMode = mode;
		this.targetId 	= target.id;
	},
	
	_dropOut: function(mode,nodeId,targetId) {
		var node 		 = this._findItem(nodeId);
		var target 		 = this._findItem(targetId);
		
		if(!node || !target || target.id!=this.targetId || mode != this.targetMode)  {
			return;
		}
		
		this.tree.element.find('.'+this.options.classes.dropBehind).detach();
		
		var targetFolder = mode?target:target.parent;
		if(targetFolder==this.tree) {
			targetFolder.element.removeClass(this.options.classes.dropHoverRoot);
		} else {
			targetFolder.element.removeClass(this.options.classes.dropHover);
		}
	},
	
	_dropBehind: function(nodeId,targetId) {
		this._dropOut(this.targetMode,nodeId,targetId);
		
		var node 	= this._findItem(nodeId);
		var target 	= this._findItem(targetId);
		var index 	= false, oldIndex = false;
		
		if(!node || !target) {
			return;
		}
		
		// find old position
		for(var i=0;i<node.parent.childs.length;i++) {
			if(node.parent.childs[i] == node) {
				oldIndex = i;
				break;
			}
		}
		
		// find target position
		// folder dropped onto entry
		if(this.options.foldersOnTop && !target.childs && node.childs) {
			index = target.parent.childs.length-1;
			while(index >= 0) {
				if(target.parent.childs[index].childs) {
					break;
				}
				index--;
			}
		// entry on folder
		} else if(this.options.foldersOnTop && target.childs && !node.childs) {
			index = target.parent.childs.length-1;
			for(i=0;i<target.parent.childs.length;i++) {
				if(!target.parent.childs[i].childs) {
					index = i-1;
					break;
				}
			}
		// folder on folder, or entry on entry
		} else {
			for(i=0;i<target.parent.childs.length;i++) {
				if(target.parent.childs[i] == target) {
					index = i;
					break;
				}
			}
			if(index===false) {
				return;
			}
		}
		
		// old position targeted
		if(target.parent == node.parent) {
			if(index+1 == oldIndex) {
				return;
			} else if(index+1 > oldIndex) {
				index--;
			}
		}
		
		// remove from parent
		node.parent.childs.splice(oldIndex,1);
		
		// insert element
		target.parent.childs.push(null);
		for(i=target.parent.childs.length-2;i>=index+1;i--) {
			target.parent.childs[i+1] = target.parent.childs[i];
		}
		target.parent.childs[index+1] = node;
		
		node.level  = target.parent.level+1;
		node.parent = target.parent;
		
		// sorting
		if(this.options.sort) {
			target.parent.childs.sort((this.options.foldersOnTop?this.sort:this.textSort));
		}
		
		if(typeof this.options.moved == 'function') {
			this.options.moved(node.id,target.parent.id,node.context,target.parent.context);
		}
		
		this._rebuildTree();
	},
	
	_dropInto: function(nodeId,targetId) {
		this._dropOut(this.targetMode,nodeId,targetId);
		
		var node 	= this._findItem(nodeId);
		var target 	= this._findItem(targetId);
		if(!target.childs) {
			target = target.parent;
		}
		if(!node || !target) {
			return;
		}
		
		// remove node from parent
		for(var i=0;i<node.parent.childs.length;i++) {
			if(node.parent.childs[i] == node) {
				node.parent.childs.splice(i,1);
				break;
			}
		}
		node.level = target.level+1;
		node.parent = target;
		
		// add to new parent
		if(!this.options.foldersOnTop || node.childs || target.childs.length == 0) {
			target.childs.unshift(node);
		} else {
			var index = -2;
			for(i=0;i<target.childs.length;i++) {
				if(!target.childs[i].childs) {
					index = i-1;
					break;
				}
			}
			// insert element
			target.childs.push(node);
			if(index>=-1) {
				var tmp = target.childs[index+1];
				target.childs[index+1] = node;
				target.childs[target.childs.length-1] = tmp;
			}
		}
		
		// sorting
		if(this.options.sort) {
			target.childs.sort((this.options.foldersOnTop?this.sort:this.textSort));
		}
		
		if(typeof this.options.moved == 'function') {
			this.options.moved(node.id,target.id,node.context,target.context);
		}
		
		this._rebuildTree();
	},
	
	_renameItem: function(id) {
		var node = this._findItem(id);
		if(!node || node.allowRename===false) {
			return;
		}
		
		var el = this.element.find('[data-treeviewid='+id+'] span');
		var ip = el.find('input');
		if(ip.length>0) {
			if(node.label != ip[0].value) {
				node.label = ip[0].value;
			
				if(this.options.sort) {
					node.parent.childs.sort((this.options.foldersOnTop?this.sort:this.textSort));
				} else if(this.options.foldersOnTop) {
					node.parent.childs.sort(this.typeSort);
				}
			
				if(typeof this.options.renamed == 'function') {
					this.options.renamed(node.id,node.label,node.context);
				}
				this.inlineEditing.active = false;
			
				this._rebuildTree();
			} else {
				el.html(node.label);
			}
		} else {
			if(this.inlineEditing.active) {
				if(this.inlineEditing.id == id) {
					return;
				}
				this._renameItem(this.inlineEditing.id);
			}
			
			this.inlineEditing.active = true;
			this.inlineEditing.id = id;
			
			ip = $('<input type="text" value="'+node.label+'"/>');
			
			var self = this;
			ip.keypress(function(event) {
				if(event.which == 13) {
					self._renameItem(id);
					event.preventDefault();
				}
			});
			ip.click(function(event) {
				event.preventDefault();
				return false;
			})
			
			el.html(ip);
			ip.focus();
		}
	},
	
	_selectItem: function(id,suppressEvent) {
		var node = this._findItem(id),p=node;
		while(p && (p=p.parent)) {
			if(p.collapsed) {
				this._toggleItem(p.id,false);
			}
		}
		
		var el;
		if(this.highlightedNode) {
			el = this.element.find('[data-treeviewid='+this.highlightedNode.id+']');
			el.removeClass(this.options.classes.highlighted);
		}
		
		var highlight = true;
		
		if(suppressEvent!==true && typeof this.options.selected == 'function') {
			highlight = this.options.selected(node?node.id:null,node?node.context:null);
			if(typeof highlight == 'undefined') {
				highlight = true;
			}
		}
		
		this.highlightedNode = null;
		
		if(!node) {
			return;
		}
		
		if(highlight) {
			this.highlightedNode = node;
			el = this.element.find('[data-treeviewid='+this.highlightedNode.id+']');
			el.addClass(this.options.classes.highlighted);	
		}
	},
	
	_toggleItem: function(id,state) {
		var node = this._findItem(id);
		if(!node || !node.childs) {
			return;
		}
		
		if(typeof state == 'undefined') {
			state = !node.collapsed;
		}
		node.collapsed = state;
		
		if(typeof this.options.toggled == 'function') {
			this.options.toggled(node.id,state,node.context);
		}
		
		var y = this.element[0].scrollTop;
		
		this._rebuildTree();
		
		this.element[0].scrollTop = y;
	},
	
	_removeItem: function(id) {
		if(!id) {
			return;
		}
		
		var node = this._findItem(id);
		if(!node) {
			return;
		}
		
		for(var i=0;i<node.parent.childs.length;i++) {
			if(node.parent.childs[i] == node) {
				node.parent.childs.splice(i,1);
				break;
			}
		}
		
		this._rebuildTree();
	},
	
	//==================================================================
	// public methods
	//==================================================================
	
	setItems: function(items) {
		this.tree.childs = [];
		
		for(var i=0;i<items.length;i++) {
			this._addItem(null,items[i]);
		}
		
		if(this.options.sort || this.options.foldersOnTop) {
			var initialSort = this.options.sort?(this.options.foldersOnTop?this.sort:this.textSort):this.typeSort;
			this._map(function(n) {
				if(n.childs) {
					n.childs.sort(initialSort);
				}
			});
		}
		
		this._rebuildTree();
	},
	
	selectItem: function(id,suppressEvent) {
		this._selectItem(id,suppressEvent);
	},
	
	addItems: function(items) {
		for(var i=0;i<items.length;i++) {
			this._addItem(items[i].parentId,items[i].item);
		}
		this._rebuildTree();
	},
	
	addItem: function(item,parentId) {
		this._addItem(parentId,item);
		this._rebuildTree();
	},
	
	removeItem: function(id) {
		this._removeItem(id);
	},
	
	toggleItem: function(id,state) {
		this._toggleItem(id,state);
	},
	
	moveItem: function(id,targetId) {
		var node 	= this._findItem(id);
		var target 	= this._findItem(targetId);
		if(!node) {
			throw "[ui.dasBaum:moveItem] item not found!";
		}
		if(!target) {
			throw "[ui.dasBaum:moveItem] target not found!";
		}
		if(!target.childs) {
			throw "[ui.dasBaum:moveItem] items can only be moved to folder!";
		}
		if(node.parent == target) {
			throw "[ui.dasBaum:moveItem] items can not be moved to its own parent!";
		}
		
		this._dropInto(id,targetId);
	},
	
	renameItem: function(id,name) {
		var node = this._findItem(id);
		if(!node) {
			return;
		}
		if(!name) {
			this._renameItem(id);
			return;
		}
		node.label = name;
		
		var el = this.element.find('[data-treeviewid='+id+'] span');
		el.html(name);
	},
	
	handleKey: function(event) {
		var up = false;
		switch(event.keyCode) {
			case 32:
				if(this.hoveredNode) {
					this.toggleItem(this.hoveredNode.id);
				}
				break;
			case 38:
				up = true;
			case 40:
				var index = this.hoveredNode?this.hoveredNode.index-(up?1:-1):0;
				var node = this._findItemWithIndex(index);
				if(node) {
					var el = this.element.find('[data-treeviewid='+node.id+']');
					el.mouseenter();
					this.hoveredNode = node;
				}
				return true;
			case 13:
				if(this.hoveredNode) {
					this.element.find('[data-treeviewid='+this.hoveredNode.id+']').click();
				} else {
					var node = this._findItemWithIndex(0);
					if(node) {
						this.element.find('[data-treeviewid='+node.id+']').click();
					}
				}
				return true;
			default:
				this.hoverFirst = true;
				
				break;
		}
		return false;
	}
});

}(jQuery));