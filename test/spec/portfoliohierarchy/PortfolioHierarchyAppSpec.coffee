Ext = window.Ext4 || window.Ext

Ext.require [
  'Rally.app.Context'
  'Rally.test.mock.data.WsapiModelFactory'
  'Rally.apps.portfoliohierarchy.PortfolioHierarchyApp'
]

describe 'Rally.apps.portfoliohierarchy.PortfolioHierarchyApp', ->

  helpers

    _createApp: (settings) ->
      globalContext = Rally.environment.getContext()

      context = Ext.create 'Rally.app.Context',
        initialValues:
          project: globalContext.getProject()
          workspace: globalContext.getWorkspace()
          user: globalContext.getUser()
          subscription: globalContext.getSubscription()

      options =
        context: context
        renderTo: 'testDiv'

      if settings
        options.settings = settings

      @app = Ext.create 'Rally.apps.portfoliohierarchy.PortfolioHierarchyApp', options

      @waitForComponentReady(@app)

  beforeEach ->

    Rally.environment.getContext().context.subscription.Modules = ['Rally Portfolio Manager']

    @userStoryModel = Rally.test.mock.data.WsapiModelFactory.getUserStoryModel()

    @ajax.whenQuerying('typedefinition').respondWith [
      Rally.test.mock.data.WsapiModelFactory.getModelDefinition('PortfolioItemStrategy')
    ]
    
  afterEach ->
    @app?.destroy()


  it 'test draws portfolio tree', ->
    interceptor = @ajax.whenQuerying('PortfolioItem/Strategy').respondWith [
      {FormattedID: 'S1', ObjectID: '1', Name: 'Strategy 1'}
    ]

    @_createApp().then =>

      sinon.assert.calledOnce(interceptor)
      expect(@app.query('rallyportfolioitemtreeitem').length).toBe 1


  it 'test filter info displayed', ->
    @ajax.whenQuerying('PortfolioItem/Strategy').respondWith()

    @_createApp().then =>

      expect(@app.getEl().down('.filterInfo')).toBeInstanceOf Ext.Element

    

  it 'test project setting label is shown if following a specific project scope', ->
    @ajax.whenQuerying('PortfolioItem/Strategy').respondWith()

    @_createApp(
      project: '/project/431439'
    ).then =>

      @app.down('rallyfilterinfo').tooltip.show()

      tooltipContent = Ext.get(Ext.query('.filterInfoTooltip')[0])

      expect(tooltipContent.dom.innerHTML).toContain 'Project'
      expect(tooltipContent.dom.innerHTML).toContain 'Project 1'

      @app.down('rallyfilterinfo').tooltip.destroy()
    

  it 'test project setting label shows "Following Global Project Setting" if following global project scope', ->
    @ajax.whenQuerying('project').respondWith [{
      Name: 'test Project'
      _ref: '/project/2'
    }]

    @_createApp().then =>

      @app.down('rallyfilterinfo').tooltip.show()

      tooltipContent = Ext.get(Ext.query('.filterInfoTooltip')[0])

      expect(tooltipContent.dom.innerHTML).toContain 'Following Global Project Setting'

      @app.down('rallyfilterinfo').tooltip.destroy()
    

  it 'test help component is shown', ->
    @ajax.whenQuerying('PortfolioItem/Strategy').respondWith()

    @_createApp().then =>
      expect(@app).toHaveHelpComponent()

  it 'test empty query string does not create a filter', ->
    @_createApp(
      query: ''
    ).then =>

      tree = @app.down('rallytree')

      expect(tree.topLevelStoreConfig.filters.length).toBe 0

  it 'test non-empty query string creates a filter', ->
    @_createApp(
      query: '(Name = "blah")'
    ).then =>

      tree = @app.down('rallytree')

      expect(tree.topLevelStoreConfig.filters.length).toBe 1
      expect(tree.topLevelStoreConfig.filters[0].toString()).toEqual '(Name = "blah")'

  it 'should display an error message if you do not have RPM turned on ', ->
    Rally.environment.getContext().context.subscription.Modules = []
    loadSpy = @spy Rally.data.util.PortfolioItemHelper, 'loadTypeOrDefault'

    @_createApp().then =>
      expect(loadSpy.callCount).toBe 0
      expect(@app.down('#bodyContainer').getEl().dom.innerHTML).toContain 'You do not have RPM enabled for your subscription'

  it 'should set workspace on the tree config', ->
    @_createApp().then =>
      tree = @app.down('rallytree')
      expect(tree.workspace._ref).toBe Rally.environment.getContext().getWorkspace()._ref
