package com.taoswork.tallybook.adminsite.conf.mvc;

import com.taoswork.tallybook.admincore.TallyBookAdminCoreRoot;
import com.taoswork.tallybook.general.extension.collections.MapBuilder;
import com.taoswork.tallybook.general.extension.collections.SetBuilder;
import com.taoswork.tallybook.general.solution.message.MessageUtility;
import com.taoswork.tallybook.general.solution.message.i18nMessageFileArranger;
import com.taoswork.tallybook.general.web.view.thymeleaf.TallyBookDataViewResolver;
import com.taoswork.tallybook.general.web.view.thymeleaf.TallyBookDialect;
import com.taoswork.tallybook.general.web.view.thymeleaf.TallyBookThymeleafViewResolver;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.ReloadableResourceBundleMessageSource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.util.ResourceUtils;
import org.springframework.web.servlet.ViewResolver;
import org.thymeleaf.dialect.IDialect;
import org.thymeleaf.messageresolver.IMessageResolver;
import org.thymeleaf.spring4.SpringTemplateEngine;
import org.thymeleaf.spring4.messageresolver.SpringMessageResolver;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;
import org.thymeleaf.templateresolver.TemplateResolver;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Created by Gao Yuan on 2015/4/22.
 */
@Configuration
public class MvcViewConfigurer {
    private static final Logger LOGGER = LoggerFactory.getLogger(MvcViewConfigurer.class);

    protected static Set<TemplateResolver> templateResolverSet() {
        Set<TemplateResolver> resolvers = new HashSet<TemplateResolver>();
//        {
//            TemplateResolver resolver = (new TallyBookThymeleafServletContextTemplateResolver();
//            resolver.setPrefix("webcontent/admin_style/templates/");
//            resolver.setSuffix(".html");
//            resolver.setTemplateMode("HTML5");
//            resolver.setCharacterEncoding("UTF-8");
//
//            resolvers.add(resolver);
//        }
        {
            ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
            resolver.setPrefix("webcontent/admin_style/template/html/");
            resolver.setSuffix(".html");
            resolver.setTemplateMode("HTML5");
            resolver.setCharacterEncoding("UTF-8");
            resolver.setCacheable(true);

            resolvers.add(resolver);
        }
        return resolvers;
    }

    @Bean
    public MessageSource messageSource() {
        ReloadableResourceBundleMessageSource ms = new ReloadableResourceBundleMessageSource();

        PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        List<String> basenameList = new ArrayList<String>();
        basenameList.add("classpath:/messages/OpenAdminGeneralMessages");
        basenameList.add("classpath:/messages/OpenAdminMessages");
        MessageUtility.getMessageBasenamesUnderDirectory(resolver, "entity-messages", basenameList);
        ms.setBasenames(basenameList.toArray(new String[basenameList.size()]));
        return ms;
    }


    @Bean
    public SpringMessageResolver messageResolver() {
        return new SpringMessageResolver();
    }

    private SpringMessageResolver messageResolverByBasenames(String[] basenames) {
        SpringMessageResolver messageResolver = new SpringMessageResolver();
        ReloadableResourceBundleMessageSource ms = new ReloadableResourceBundleMessageSource();
        ms.setBasenames(basenames);
        messageResolver.setMessageSource(ms);
        return messageResolver;
    }

    @Bean
    public SpringTemplateEngine thymeleafTemplateEngine() {
        SpringTemplateEngine templateEngine = new SpringTemplateEngine();

        Set<IMessageResolver> messageResolvers =  new SetBuilder<IMessageResolver>()
                .append(messageResolver())
                .append(messageResolverByBasenames(TallyBookAdminCoreRoot.getMessageBasenames()));
        templateEngine.setMessageResolvers(messageResolvers);

        templateEngine.setTemplateResolvers(templateResolverSet());

        templateEngine.setAdditionalDialects(
            new SetBuilder<IDialect>()
                .append(new TallyBookDialect()));
        return templateEngine;
    }

    @Bean
    public TallyBookThymeleafViewResolver thymeleafViewResolver() {
        TallyBookThymeleafViewResolver viewResolver = new TallyBookThymeleafViewResolver();
        viewResolver.setOrder(1);
        viewResolver.setTemplateEngine(thymeleafTemplateEngine());
        viewResolver.setCharacterEncoding("UTF-8");
        viewResolver.setDefaultLayout("entity/layout/entityLayout");
        viewResolver.setLayoutMap(
            new MapBuilder<String, String>()
                .append("login/", "login/layout/loginLayout")
                .append("entity/content/modalView", "NULL")
        );
        return viewResolver;
    }

    @Bean
    public ViewResolver dataViewResolver(){
        TallyBookDataViewResolver view = new TallyBookDataViewResolver();
        view.setOrder(0);
        return view;
    }


}
