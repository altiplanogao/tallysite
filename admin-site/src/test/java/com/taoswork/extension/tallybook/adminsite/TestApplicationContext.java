package com.taoswork.extension.tallybook.adminsite;

/**
 * Created by Gao Yuan on 2015/5/15.
 */
public class TestApplicationContext {
/*
    protected ApplicationContext genericApplicationContext;
    protected ApplicationContext servletApplicationContext;

    @Before
    public void loadApplicationContext(){
        AnnotationConfigApplicationContext annotationGenricConfigApplicationContext =
                new AnnotationConfigApplicationContext(
                        AdminContextConfigurer.class);
        genericApplicationContext =annotationGenricConfigApplicationContext;

//        AnnotationConfigApplicationContext annotationConfigApplicationContext =
//                new AnnotationConfigApplicationContext(
//                        AdminServletConfigurer.class);
//        servletApplicationContext = annotationConfigApplicationContext;

    }

    @Test
    public void testGenricApplicationContext(){
        Assert.assertNotNull(genericApplicationContext);
        TallyUserDataService tallyUserDataService = (TallyUserDataService)genericApplicationContext.getBean(TallyUserDataService.COMPONENT_NAME);
        Assert.assertNotNull(tallyUserDataService);
        TallyAdminDataService tallyAdminDataService = (TallyAdminDataService)genericApplicationContext.getBean(TallyAdminDataService.COMPONENT_NAME);
        Assert.assertNotNull(tallyAdminDataService);
        UserDetailsService adminEmployeeDetailsService = (UserDetailsService)genericApplicationContext.getBean(AdminEmployeeDetailsService.COMPONENT_NAME);
        Assert.assertNotNull(adminEmployeeDetailsService);

        FilterChainProxy springSecurityFilterChain = (FilterChainProxy)genericApplicationContext.getBean("springSecurityFilterChain");
        Assert.assertNotNull(springSecurityFilterChain);
    }
    */


//
//    @Test
//    public void testServletContext(){
//         AdminLoginController controller = (AdminLoginController)servletApplicationContext.getBean(AdminLoginController.CONTROLLER_NAME);
//        Assert.assertNotNull(controller);
//    }
}
