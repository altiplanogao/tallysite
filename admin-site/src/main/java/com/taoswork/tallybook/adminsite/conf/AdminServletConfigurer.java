package com.taoswork.tallybook.adminsite.conf;

import com.taoswork.tallybook.adminmvc.conf.AdminMvcConfig;
import com.taoswork.tallybook.adminsite.conf.mvc.MvcControllerConfig;
import com.taoswork.tallybook.adminsite.conf.mvc.MvcViewConfigurer;
import com.taoswork.tallybook.general.solution.spring.BeanCreationMonitor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.web.servlet.config.annotation.DefaultServletHandlerConfigurer;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurerAdapter;

/**
 * Created by Gao Yuan on 2015/4/20.
 */
@Configuration
@EnableWebMvc
@Import({
        AdminMvcConfig.class,
        MvcControllerConfig.class,
        MvcViewConfigurer.class,
})
public class AdminServletConfigurer extends WebMvcConfigurerAdapter {

    @Bean
    BeanCreationMonitor beanCreationMonitor(){
        return new BeanCreationMonitor("AdminServlet");
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {

        registry.addResourceHandler("/img/**")
                .addResourceLocations(
                        "classpath:/webcontent/admin_style/template/img/",
                        "/webcontent/admin_style/template/img/");
        registry.addResourceHandler("/lib/**")
                .addResourceLocations(
                        "classpath:/webcontent/admin_style/template/lib/",
                        "/webcontent/admin_style/template/lib/");
        registry.addResourceHandler("/css/**")
                .addResourceLocations(
                        "classpath:/webcontent/admin_style/template/css/",
                        "/webcontent/admin_style/template/css/");
        registry.addResourceHandler("/js/**")
                .addResourceLocations(
                        "classpath:/webcontent/admin_style/template/js/");
        registry.addResourceHandler("/favicon.ico")
                .addResourceLocations("WEB-INF/favicon.ico");
        registry.addResourceHandler("/robots.txt")
                .addResourceLocations("WEB-INF/robots.txt");
        registry.setOrder(-100); //make the ResourceHandlerMapping processed before others

        super.addResourceHandlers(registry);
    }

    @Override
    public void configureDefaultServletHandling(DefaultServletHandlerConfigurer configurer) {
        configurer.enable();
    }

}
