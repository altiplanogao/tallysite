package com.taoswork.tallybook.adminsite.conf.trash;

import org.springframework.context.annotation.Configuration;

/**
 * Created by Gao Yuan on 2015/4/20.
 */
@Configuration
public class PersistenceConfig2 {

    /*
    //Prediction: must have JNDI enabled with name: jdbc/userdb

    //DATASOURCE KEY is used in persistence.xml
    public static final String HOST_USER_DATA_JNDI_NAME = "jdbc/hostUserdb";
    public static final String HOST_USER_DATA_DATASOURCE_KEY = "jdbcAdminUserDs";

    @Bean
    public DataSource hostUserDataSource(){
        return new JndiDataSourceLookup().getDataSource(HOST_USER_DATA_JNDI_NAME);
    }

    @Bean
    public JpaVendorAdapter jpaVendorAdapter(){
        return new HibernateJpaVendorAdapter();
    }

   @Bean
    public Map<String, DataSource> dataSources(){
        Map<String, DataSource> map = new HashMap<String, DataSource>();
        map.put(HOST_USER_DATA_DATASOURCE_KEY, hostUserDataSource());
        return map;
    }

    @Bean
    public JPAPropertiesPersistenceUnitPostProcessor jpaPropertiesPersistenceUnitPostProcessor(){
        JPAPropertiesPersistenceUnitPostProcessor postProcessor = new JPAPropertiesPersistenceUnitPostProcessor();
        postProcessor.setPersistenceProps(runtimeEnvironmentPropertyPlaceholderConfigurer()
                .getSubCollectionProperties("persistence"));
        return postProcessor;
    }

    @Bean
    RuntimeEnvironmentPropertyPlaceholderConfigurer runtimeEnvironmentPropertyPlaceholderConfigurer(){
        RuntimeEnvironmentPropertyPlaceholderConfigurer propertyPlaceholderConfigurer = new RuntimeEnvironmentPropertyPlaceholderConfigurer();
   //     propertyPlaceholderConfigurer.setPropertyPathResources();
        return propertyPlaceholderConfigurer;
    }

    @Bean
    public PersistenceUnitManager persistenceUnitManager(){
        DefaultPersistenceUnitManager persistenceUnitManager = new DefaultPersistenceUnitManager();
        persistenceUnitManager.setPersistenceXmlLocations(
                "classpath:/META-INF/persistence/persistence-admin-tallyuser.xml");
//        persistenceUnitManager.setPersistenceXmlLocations();
        persistenceUnitManager.setDataSources(dataSources());
        persistenceUnitManager.setPersistenceUnitPostProcessors(
                jpaPropertiesPersistenceUnitPostProcessor()
        );
        //persistenceUnitManager.setPersistenceUnitPostProcessors(new PersistenceAnnotationBeanPostProcessor());
        return persistenceUnitManager;
    }

    @Bean
    AbstractEntityManagerFactoryBean entityManagerFactory(){
        LocalContainerEntityManagerFactoryBean entityManagerFactory = new LocalContainerEntityManagerFactoryBean();
        entityManagerFactory.setJpaVendorAdapter(jpaVendorAdapter());
        entityManagerFactory.setPersistenceUnitManager(persistenceUnitManager());
        entityManagerFactory.setPersistenceUnitName(TypeSafeAdminRoot.PuName4Admin);
        entityManagerFactory.setLoadTimeWeaver(new InstrumentationLoadTimeWeaver());
       return  entityManagerFactory;
    }
    */

    /*
       @Bean
    AbstractEntityManagerFactoryBean entityManagerFactory(){
        LocalContainerEntityManagerFactoryBean entityManagerFactory = new LocalContainerEntityManagerFactoryBean();
        entityManagerFactory.setJpaVendorAdapter(jpaVendorAdapter());
 //       entityManagerFactory.setPersistenceXmlLocation("classpath*:/persistence/persistence-admin-tallyuser.xml");
        entityManagerFactory.setPersistenceUnitManager(persistenceUnitManager());
//        entityManagerFactory.setDataSource(hostUserDataSource());
        entityManagerFactory.setPersistenceUnitName(TypeSafeAdminRoot.PuName4Admin);
       return  entityManagerFactory;
    }
    * */
}
