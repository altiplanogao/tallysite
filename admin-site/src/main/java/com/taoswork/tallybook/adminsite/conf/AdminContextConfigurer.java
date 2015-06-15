package com.taoswork.tallybook.adminsite.conf;

import com.taoswork.tallybook.admincore.conf.AdminCoreConfig;
import com.taoswork.tallybook.adminsite.conf.model.SecurityConfig;
import com.taoswork.tallybook.general.solution.property.RuntimeEnvironmentPropertyPlaceholderConfigurer;
import com.taoswork.tallybook.general.solution.spring.BeanCreationMonitor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

/**
 * Created by Gao Yuan on 2015/5/14.
 */
@Configuration
@Import({
        AdminCoreConfig.class,
        SecurityConfig.class,
})
public class AdminContextConfigurer {
 //       private static final Logger LOGGER = LoggerFactory.getLogger(AdminContextConfigurer.class);

        @Bean
        RuntimeEnvironmentPropertyPlaceholderConfigurer runtimeEnvironmentPropertyPlaceholderConfigurer(){
                RuntimeEnvironmentPropertyPlaceholderConfigurer runtimePropertyConfigurer = new RuntimeEnvironmentPropertyPlaceholderConfigurer();
                runtimePropertyConfigurer.setPublisherVisible(true);
                return runtimePropertyConfigurer;
        }

        @Bean
        BeanCreationMonitor beanCreationMonitor(){
                return new BeanCreationMonitor("RootAppCtx");
        }
}
